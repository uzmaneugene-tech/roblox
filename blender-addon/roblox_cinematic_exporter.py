bl_info = {"name": "Roblox Cinematic", "author": "CodeRabbit", "version": (1, 0, 0),
           "blender": (3, 6, 0), "location": "3D View > Sidebar > Roblox Cinematic",
           "description": "Bake a cinematic timeline for client playback in Roblox", "category": "Import-Export"}

import bpy
import json
import math
import os
import re
import tempfile
from pathlib import Path
from mathutils import Matrix
from bpy.props import (BoolProperty, CollectionProperty, EnumProperty, FloatProperty,
                       FloatVectorProperty, IntProperty, PointerProperty, StringProperty)

AX = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))
R15 = dict(zip(
    "HumanoidRootPart LowerTorso UpperTorso Head LeftUpperArm LeftLowerArm LeftHand RightUpperArm RightLowerArm RightHand LeftUpperLeg LeftLowerLeg LeftFoot RightUpperLeg RightLowerLeg RightFoot".split(),
    ["", "Root", "Waist", "Neck", "LeftShoulder", "LeftElbow", "LeftWrist", "RightShoulder", "RightElbow", "RightWrist", "LeftHip", "LeftKnee", "LeftAnkle", "RightHip", "RightKnee", "RightAnkle"]))
LIMIT = 190000


class Shot(bpy.types.PropertyGroup):
    caption: StringProperty(name="Caption", description="Words shown during this shot")
    duration: FloatProperty(name="Duration", description="Seconds this shot stays on screen", default=2, min=.01)
    transition: EnumProperty(name="Transition", description="How this shot starts", items=[(s,s,s) for s in ("Cut","Fade","CrossFade")])
    transition_time: FloatProperty(name="Transition seconds", description="Time to blend into this shot", default=.35, min=0)
    shake: FloatProperty(name="Shake", description="Amount of gentle camera movement", min=0, max=1)
    fov_start: FloatProperty(name="Start FOV", description="Vertical angle in degrees; zero uses the lens at shot start", min=0, max=120)
    fov_end: FloatProperty(name="End FOV", description="Vertical angle in degrees; zero uses the lens at shot end", min=0, max=120)
    speaker_color: FloatVectorProperty(name="Speaker color", description="Caption RGB color", subtype='COLOR_GAMMA', size=3, default=(1,1,1), min=0, max=1)


class Mapping(bpy.types.PropertyGroup):
    bone: StringProperty(name="Bone", description="Name of the Blender pose bone; blank rows are ignored")
    motor: StringProperty(name="Motor", description="Name of the matching Roblox Motor6D; blank means skip")


class Settings(bpy.types.PropertyGroup):
    scale: FloatProperty(name="Studs per unit", description="Distance in Roblox for one Blender unit", default=3.571, min=.0001)
    step: IntProperty(name="Camera frame step", description="Frames between camera samples", default=2, min=1)
    rate: EnumProperty(name="Animation FPS", description="Object and bone samples per second", items=[("30","30","30 samples per second"),("60","60","60 samples per second")])
    compact: BoolProperty(name="Only export when changed", description="Drop repeated poses while preserving the end of each hold", default=True)
    text: PointerProperty(type=bpy.types.Text, name="Story text", description="One caption per line, including blank lines")
    rig: PointerProperty(type=bpy.types.Object, name="Armature", description="Animated R15 skeleton")
    model: StringProperty(name="Workspace rig model", description="Unique name of the target Roblox character model", default="CinematicRig")
    mappings: CollectionProperty(type=Mapping)
    folder: StringProperty(name="Output folder", description="Folder for CutsceneData and any numbered parts", subtype='DIR_PATH', default="//")
    status: StringProperty()


def shots(scene):
    def key(o):
        return ([int(t) if i%2 else t.casefold() for i,t in enumerate(re.split(r'(\d+)',o.name))], o.name)
    return sorted((o for o in scene.objects if o.type=='CAMERA' and o.name.startswith('Shot')), key=key)


def rounded(x):
    if not math.isfinite(x):
        raise ValueError("A transform or setting contains a non-finite number")
    return round(x,4) or 0


def components(p,r):
    return tuple(rounded(n) for n in (*p, *(n for row in r for n in row)))


def cf(m,scale,camera=False):
    # Conjugate the rotation to express both coordinate bases in Roblox axes.
    # Cameras share local right/up/back axes in both engines: undo the local
    # basis change for cameras, leaving only the world-axis conversion.
    r = AX @ m.to_quaternion().to_matrix() @ AX.transposed()
    return components((AX @ m.translation)*scale, r @ AX if camera else r)


def fov(camera, scene):
    # view_frame resolves sensor fit, lens, render size and pixel aspect.
    # Vertical aperture / focal length = frame height / distance from origin.
    if camera.type != 'PERSP':
        raise ValueError("Use perspective lenses on shot cameras")
    v = camera.view_frame(scene=scene)
    angle = math.degrees(2*math.atan((max(p.y for p in v)-min(p.y for p in v))/(2*abs(v[0].z))))
    return rounded(min(120,max(1,angle)))


def times(length, interval):
    for i in range(math.ceil(length/interval)):
        if i*interval < length:
            yield i*interval
    yield length


def compress(track, field):
    # Keep BOTH edges of constant runs; dropping the final edge starts a glide too early.
    return [p for i,p in enumerate(track) if i in (0,len(track)-1) or
            not track[i-1][field] == p[field] == track[i+1][field]]


def bake(ctx):
    scene=ctx.scene
    cfg=scene.rbx_cine
    if cfg.rig and cfg.rig.type != 'ARMATURE':
        raise ValueError('Choose an armature object in Rig Animation')
    cams=shots(scene)
    if not cams:
        raise ValueError("Add a perspective camera named Shot1")
    if len({c.name for c in cams})!=len(cams):
        raise ValueError("Shot names must be unique, including linked cameras")
    warnings=[]
    data=dict(version=1,shots=[],objects=[],bones=[],rig=cfg.model)
    fps=scene.render.fps/scene.render.fps_base
    graph=ctx.evaluated_depsgraph_get()
    def seek(seconds):
        frame=scene.frame_start+seconds*fps
        scene.frame_set(math.floor(frame),subframe=frame%1)
    saved=(scene.frame_current,scene.frame_subframe)
    try:
        start=0
        for cam in cams:
            s=cam.rbx_shot
            duration=rounded(s.duration)
            path=[]
            for t in times(duration,cfg.step/fps):
                seek(start+t)
                obj=cam.evaluated_get(graph)
                if not path:
                    first=fov(obj.data,scene)
                path.append(dict(t=rounded(t),cf=cf(obj.matrix_world,cfg.scale,True)))
            data['shots'].append(dict(name=cam.name,caption=s.caption,duration=duration,transition=s.transition,
                transition_time=rounded(min(duration,s.transition_time)),shake=rounded(s.shake),
                fov_start=rounded(s.fov_start or first),fov_end=rounded(s.fov_end or fov(obj.data,scene)),
                speaker_color=list(map(rounded,s.speaker_color)),path=compress(path,'cf')))
            start+=duration
        def animated(o):
            while o:
                ad=o.animation_data
                if o.constraints or (ad and (ad.action or ad.nla_tracks or ad.drivers)):
                    return True
                o=o.parent
            return False
        objects=[]
        for o in ctx.selected_objects:
            if o.type in ('CAMERA','ARMATURE'):
                continue
            if not animated(o):
                warnings.append("Skipped unanimated "+o.name)
                continue
            if not re.fullmatch(r'[A-Za-z0-9_]+',o.name):
                warnings.append("Match punctuation/spaces exactly: "+o.name)
            tr=dict(name=o.name,path=[],visibility=[])
            objects.append((o,tr))
            data['objects'].append(tr)
        bones=[]
        for row in cfg.mappings if cfg.rig else ():
            if not row.bone or not row.motor:
                continue
            if row.bone not in cfg.rig.pose.bones or any(tr['name']==row.motor for _,tr in bones):
                raise ValueError("Missing bone or repeated motor: "+row.bone+" / "+row.motor)
            tr=dict(name=row.motor,path=[])
            bones.append((row.bone,tr))
            data['bones'].append(tr)
        for t in times(start,1/int(cfg.rate)) if objects or bones else ():
            seek(t)
            for o,tr in objects:
                e=o.evaluated_get(graph)
                tr['path'].append(dict(t=rounded(t),cf=cf(e.matrix_world,cfg.scale)))
                alpha=int(e.hide_render or e.hide_viewport)
                if not tr['visibility'] or tr['visibility'][-1]['value']!=alpha:
                    tr['visibility'].append(dict(t=rounded(t),value=alpha))
            if bones:
                rig=cfg.rig.evaluated_get(graph)
                for name,tr in bones:
                    b=rig.pose.bones[name]
                    rest=b.bone.matrix_local
                    pose=b.matrix
                    if b.parent:
                        rest=b.parent.bone.matrix_local.inverted_safe() @ rest
                        pose=b.parent.matrix.inverted_safe() @ pose
                    # Pose delta in the bone's own rest axes. Target motor must have matching axes.
                    delta=(rest.inverted_safe() @ pose).to_quaternion().to_matrix()
                    tr['path'].append(dict(t=rounded(t),cf=components((0,0,0), AX @ delta @ AX.transposed())))
        if cfg.compact:
            for _,tr in objects+bones:
                tr['path']=compress(tr['path'],'cf')
    finally:
        scene.frame_set(saved[0],subframe=saved[1])
    return data,warnings


def literal(v):
    if isinstance(v,tuple):
        return "CFrame.new("+",".join(map(str,v))+")"
    if isinstance(v,str):
        # Decimal byte escapes avoid JSON-only Unicode escapes and Lua source injection.
        return '"'+''.join(chr(b) if 32<=b<127 and b not in (34,92) else '\\%03d'%b for b in v.encode())+'"'
    if isinstance(v,list):
        return "{"+",".join(map(literal,v))+"}"
    if isinstance(v,dict):
        return "{"+",".join(k+"="+literal(x) for k,x in v.items())+"}"
    return str(v)


def scripts(data):
    # Split at individual samples, even inside a single very long shot.
    header="local d={shots={},objects={},bones={}}\n"
    lines=["d.version=1\n","d.rig="+literal(data['rig'])+"\n"]
    for group in ('shots','objects','bones'):
        for i,item in enumerate(data[group],1):
            key=f"d.{group}[{i}]"
            lines.append(key+"={}\n")
            for field,value in item.items():
                dst=key+"."+field
                if field in ('path','visibility'):
                    lines.append(dst+"={}\n")
                    for j,sample in enumerate(value,1):
                        lines.append(f"{dst}[{j}]="+literal(sample)+"\n")
                elif field=='caption':
                    lines.append(dst+'=""\n')
                    for pos in range(0,len(value),2000):
                        lines.append(dst+"..="+literal(value[pos:pos+2000])+"\n")
                else:
                    lines.append(dst+"="+literal(value)+"\n")
    body=''.join(lines)
    if len(header+body+'return d\n')<=LIMIT:
        return {'CutsceneData':header+body+'return d\n'}
    parts={}
    chunk=[]
    size=0
    for line in lines:
        if len(line)>LIMIT-100:
            raise ValueError("A name is too long to fit in a script")
        if size+len(line)>LIMIT-100:
            parts['Part'+str(len(parts)+1)]='return function(d)\n'+''.join(chunk)+'end\n'
            chunk=[]
            size=0
        chunk.append(line)
        size+=len(line)
    parts['Part'+str(len(parts)+1)]='return function(d)\n'+''.join(chunk)+'end\n'
    parts['CutsceneData']=header+f'for i=1,{len(parts)} do require(script["Part"..i])(d) end\nreturn d\n'
    return parts


class Action(bpy.types.Operator):
    bl_idname="rbxcine.action"
    bl_label="Cinematic action"
    job: StringProperty()
    @classmethod
    def description(cls,ctx,props):
        return dict(test="Print both transforms in the system console",map="Build the standard R15 mapping",
                    row="Add an editable bone and motor pair",assign="Copy one text line to each shot in numeric order",
                    lua="Write playable Luau modules",json="Write numeric JSON data",copy="Copy the data module; for large exports also write all parts")[props.job]
    def execute(self,ctx):
        cfg=ctx.scene.rbx_cine
        try:
            if self.job=='test':
                o=ctx.object
                if not o: raise ValueError("Select an object first")
                m=o.evaluated_get(ctx.evaluated_depsgraph_get()).matrix_world
                print(o.name,m,literal(cf(m,cfg.scale,o.type=='CAMERA')))
                self.report({'INFO'},"Printed transform to the system console")
            elif self.job in ('row','map'):
                if self.job=='row': cfg.mappings.add()
                else:
                    cfg.mappings.clear()
                    for name,motor in R15.items():
                        row=cfg.mappings.add()
                        row.bone,row.motor=name,motor
            elif self.job=='assign':
                cams=shots(ctx.scene)
                if not cfg.text or not cams: raise ValueError("Choose a story text and add shot cameras first")
                lines=cfg.text.as_string().splitlines()
                if len(lines)!=len(cams): raise ValueError(f"Found {len(lines)} lines for {len(cams)} shots; make the counts match")
                for cam,line in zip(cams,lines): cam.rbx_shot.caption=line
            else:
                d,w=bake(ctx)
                files=({'CutsceneData.json':json.dumps(d,ensure_ascii=False,separators=(',',':'))} if self.job=='json'
                       else {n+'.lua':v for n,v in scripts(d).items()})
                if self.job!='copy' or len(files)>1:
                    folder=Path(bpy.path.abspath(cfg.folder))
                    folder.mkdir(parents=True,exist_ok=True)
                    for name,body in files.items():
                        with tempfile.NamedTemporaryFile('w',dir=folder,encoding='utf8',delete=False) as f:
                            f.write(body)
                        os.replace(f.name,folder/name)
                if self.job=='copy': ctx.window_manager.clipboard=files['CutsceneData.lua']
                cfg.status=f"{len(d['shots'])} shots, {len(d['objects'])} objects, {len(d['bones'])} bones; {sum(map(len,files.values())):,} chars, {sum(s['duration'] for s in d['shots']):.2f}s"
                if len(files)>1: cfg.status+=f"; {len(files)-1} parts written"
                self.report({'INFO'},cfg.status)
                if w:
                    print('\n'.join(w))
                    self.report({'WARNING'},w[0]+f" ({len(w)} warnings; see console)")
            return {'FINISHED'}
        except Exception as err:
            self.report({'ERROR'},str(err))
            return {'CANCELLED'}


class Panel(bpy.types.Panel):
    bl_label="Roblox Cinematic"
    bl_idname="VIEW3D_PT_rbxcine"
    bl_space_type='VIEW_3D'
    bl_region_type='UI'
    bl_category="Roblox Cinematic"
    def draw(self,ctx):
        cfg=ctx.scene.rbx_cine
        def box(title):
            b=self.layout.box()
            b.label(text=title)
            return b
        def button(b,title,job):
            b.operator(Action.bl_idname,text=title).job=job
        b=box("Export Settings")
        b.prop(cfg,'scale')
        button(b,"Test Conversion","test")
        b=box("Shots")
        b.prop(cfg,'step')
        b.label(text=f"{len(shots(ctx.scene))} shots • select a camera to edit")
        o=ctx.object
        if o and o in shots(ctx.scene):
            for key in Shot.__annotations__: b.prop(o.rbx_shot,key)
        b=box("Captions")
        b.prop(cfg,'text')
        button(b,"Assign caption lines","assign")
        b=box("Object Animation")
        b.prop(cfg,'rate')
        b.prop(cfg,'compact')
        b=box("Rig Animation")
        b.prop(cfg,'rig')
        b.prop(cfg,'model')
        button(b,"Auto map R15","map")
        for row in cfg.mappings:
            pair=b.row()
            pair.prop(row,'bone',text="")
            pair.prop(row,'motor',text="")
        button(b,"Add mapping","row")
        b=box("Export")
        b.prop(cfg,'folder')
        for title,job in [('Export Luau','lua'),('Copy to Clipboard','copy'),('Export JSON','json')]: button(b,title,job)
        if cfg.status: b.label(text=cfg.status)


classes=(Shot,Mapping,Settings,Action,Panel)
def register():
    for cls in classes: bpy.utils.register_class(cls)
    bpy.types.Scene.rbx_cine=PointerProperty(type=Settings)
    bpy.types.Object.rbx_shot=PointerProperty(type=Shot)


def unregister():
    del bpy.types.Object.rbx_shot
    del bpy.types.Scene.rbx_cine
    for cls in reversed(classes): bpy.utils.unregister_class(cls)


if __name__=="__main__": register()
