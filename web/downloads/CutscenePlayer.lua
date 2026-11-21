--!strict
-- Place this ModuleScript in ReplicatedStorage. Only require it from a LocalScript.
local Players = game:GetService("Players")
local Run = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")
local TweenService = game:GetService("TweenService")
local Capture = game:GetService("CaptureService")
local Workspace = game:GetService("Workspace")

type Pose = {t:number, cf:CFrame}
type Visibility = {t:number, value:number}
type Track = {name:string, path:{Pose}}
type ObjectTrack = Track & {visibility:{Visibility}}
type Shot = {name:string, path:{Pose}, duration:number, caption:string, shake:number,
    transition:string, transition_time:number, fov_start:number, fov_end:number, speaker_color:{number}}
export type Data = {version:number, shots:{Shot}, objects:{ObjectTrack}, bones:{Track}, rig:string}
type Options = {HideUI:boolean?, HideCharacter:boolean?, Typewriter:boolean?, CharactersPerSecond:number?}

-- Find the last key at or before t. Binary search also works after a backward skip.
local function indexAt<T>(keys:{T}, timeOf:(T)->number, t:number):number
    local lo, hi = 1, #keys
    while lo < hi do
        local mid = math.ceil((lo+hi)/2)
        if timeOf(keys[mid]) <= t then lo = mid else hi = mid-1 end
    end
    return lo
end
local function poseTime(p:Pose):number return p.t end
local function visibilityTime(p:Visibility):number return p.t end
local function sample(keys:{Pose}, t:number):CFrame
    local i = indexAt(keys, poseTime, t)
    local a,b = keys[i], keys[i+1]
    if not b or b.t<=a.t then return a.cf end
    return a.cf:Lerp(b.cf, math.clamp((t-a.t)/(b.t-a.t),0,1))
end

local Player = {}
local owner: {}? = nil -- Only one player can own the local camera.
function Player.new(data:Data, options:Options?)
    assert(Run:IsClient(), "Start the cutscene from a LocalScript")
    assert(data.version==1 and #data.shots>0, "Expected cinematic data version 1 with shots")
    local opts:Options = options or {}
    local user=Players.LocalPlayer
    local playerGui=user:WaitForChild("PlayerGui")
    local controls=require(user:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule") :: ModuleScript):GetControls()
    local completed=Instance.new("BindableEvent")
    local api={Completed=completed.Event}
    local active,paused,disposed=false,false,false
    local undo:{()->()}={}
    local starts:{number}={}
    local total=0
    for _,shot in data.shots do
        assert(shot.duration>0 and #shot.path>0,"Empty shot or invalid duration")
        table.insert(starts,total)
        total+=shot.duration
    end
    local function finish(reason:string)
        if not active then return end
        active=false
        -- Restore in reverse order, even if another script removed a saved instance.
        for i=#undo,1,-1 do
            local ok,msg=pcall(undo[i])
            if not ok then warn(msg) end
        end
        table.clear(undo)
        owner=nil
        completed:Fire(reason)
    end
    local function guarded(fn:()->())
        local ok,msg=xpcall(fn,debug.traceback)
        if not ok then warn(msg); finish("Error") end
    end
    local function connect(signal:RBXScriptSignal,fn:(number)->())
        local c=signal:Connect(function(dt:number)
            if active and not paused then guarded(function() fn(dt) end) end
        end)
        table.insert(undo,function() c:Disconnect() end)
    end
    local elapsed=0
    local fade:Tween?=nil
    local refresh:(()->())?=nil
    function api:Play()
        if disposed or active then return end
        assert(owner==nil,"Another cutscene is already playing")
        owner=api
        active,paused,elapsed=true,false,0
        guarded(function()
            local cam=assert(Workspace.CurrentCamera,"No camera available")
            local original,angle,subject,mode=cam.CFrame,cam.FieldOfView,cam.CameraSubject,cam.FieldOfViewMode
            table.insert(undo,function()
                cam.CameraType=Enum.CameraType.Custom
                cam.CFrame=original
                cam.FieldOfViewMode=mode
                cam.FieldOfView=angle
                if subject and subject.Parent then cam.CameraSubject=subject end
            end)
            cam.CameraType=Enum.CameraType.Scriptable
            cam.FieldOfViewMode=Enum.FieldOfViewMode.Vertical
            if controls.controlsEnabled~=false then
                table.insert(undo,function() controls:Enable() end)
                controls:Disable()
            end
            if opts.HideUI~=false then
                for _,kind in Enum.CoreGuiType:GetEnumItems() do
                    if kind~=Enum.CoreGuiType.All then
                        -- Some CoreGui types are unavailable on some devices.
                        pcall(function()
                            local was=StarterGui:GetCoreGuiEnabled(kind)
                            StarterGui:SetCoreGuiEnabled(kind,false)
                            table.insert(undo,function() StarterGui:SetCoreGuiEnabled(kind,was) end)
                        end)
                    end
                end
            end
            if opts.HideCharacter~=false then
                local function hide(node:Instance)
                    if node:IsA("BasePart") then
                        local prev=node.LocalTransparencyModifier
                        table.insert(undo,function() node.LocalTransparencyModifier=prev end)
                        node.LocalTransparencyModifier=1
                    end
                end
                local function watch(char:Model)
                    for _,node in char:GetDescendants() do hide(node) end
                    local c=char.DescendantAdded:Connect(hide)
                    table.insert(undo,function() c:Disconnect() end)
                end
                if user.Character then watch(user.Character) end
                local c=user.CharacterAdded:Connect(watch)
                table.insert(undo,function() c:Disconnect() end)
            end
            -- Resolve unique targets once. A duplicate must never move a random part.
            local function targets(root:Instance,kind:string,tracks:{Track}):{[string]:Instance}
                local wanted:{[string]:boolean}={}
                local found:{[string]:Instance}={}
                for _,tr in tracks do wanted[tr.name]=true end
                for _,node in root:GetDescendants() do
                    if wanted[node.Name] and node:IsA(kind) then
                        assert(not found[node.Name],"Ambiguous "..node.Name)
                        found[node.Name]=node
                    end
                end
                for name in wanted do assert(found[name],"Missing "..kind..": "..name) end
                return found
            end
            local objects=targets(Workspace,"BasePart",data.objects :: any)
            for _,inst in objects do
                local p=inst :: BasePart
                local frame,alpha=p.CFrame,p.Transparency
                table.insert(undo,function() p.CFrame=frame; p.Transparency=alpha end)
            end
            local motors:{[string]:Instance}={}
            if #data.bones>0 then
                local rig=targets(Workspace,"Model",{{name=data.rig,path={}}})[data.rig]
                motors=targets(rig,"Motor6D",data.bones)
                for _,inst in motors do
                    local m=inst :: Motor6D
                    local originalPose=m.Transform
                    table.insert(undo,function() m.Transform=originalPose end)
                end
            end
            local function animateObjects()
                for _,tr in data.objects do
                    local p=objects[tr.name] :: BasePart
                    p.CFrame=sample(tr.path,elapsed)
                    if #tr.visibility>0 then
                        p.Transparency=tr.visibility[indexAt(tr.visibility,visibilityTime,elapsed)].value
                    end
                end
            end
            local function animateRig()
                for _,tr in data.bones do
                    (motors[tr.name] :: Motor6D).Transform=sample(tr.path,elapsed)
                end
            end
            local gui=Instance.new("ScreenGui")
            table.insert(undo,function() gui:Destroy() end)
            gui.Name="RobloxCinematic"
            gui.IgnoreGuiInset=true
            gui.ResetOnSpawn=false
            gui.DisplayOrder=500
            gui.Parent=playerGui
            local veil=Instance.new("Frame")
            veil.Size=UDim2.fromScale(1,1)
            veil.BackgroundColor3=Color3.new(0,0,0)
            veil.BackgroundTransparency=1
            veil.BorderSizePixel=0
            veil.Parent=gui
            local still=Instance.new("ImageLabel")
            still.Size=veil.Size
            still.BackgroundTransparency=1
            still.ScaleType=Enum.ScaleType.Stretch
            still.Parent=gui
            local label=Instance.new("TextLabel")
            label.AnchorPoint=Vector2.new(.5,1)
            label.Position=UDim2.fromScale(.5,.84)
            label.Size=UDim2.fromScale(.82,.13)
            label.BackgroundColor3=Color3.new(0,0,0)
            label.BackgroundTransparency=.4
            label.TextScaled=true
            label.TextWrapped=true
            label.Font=Enum.Font.GothamBold
            label.ZIndex=3
            label.Parent=gui
            Instance.new("UIStroke",label).Thickness=1.5
            local current=0
            local captured:string?=nil
            local pending=false
            local epoch=0
            local function draw()
                assert(cam==Workspace.CurrentCamera,"CurrentCamera was replaced")
                local idx=indexAt(starts,function(n:number) return n end,elapsed)
                local s=data.shots[idx]
                local t=math.clamp(elapsed-starts[idx],0,s.duration)
                local frame=sample(s.path,t)
                local window=math.min(s.duration,s.transition_time)
                if current~=idx then
                    if fade then fade:Cancel(); fade=nil end
                    veil.BackgroundTransparency=1
                    still.Image=if current==idx-1 and s.transition=="CrossFade" then captured or "" else ""
                    captured=nil
                    pending=false
                    epoch+=1
                    if s.transition=="Fade" and t<window then
                        veil.BackgroundTransparency=t/window
                        local tw=TweenService:Create(veil,TweenInfo.new(window-t,Enum.EasingStyle.Linear),{BackgroundTransparency=1})
                        fade=tw
                        tw:Play()
                        if paused then tw:Pause() end
                    end
                    label.Text=s.caption
                    label.Visible=s.caption~=""
                    label.TextColor3=Color3.new(s.speaker_color[1],s.speaker_color[2],s.speaker_color[3])
                    current=idx
                end
                local fov=s.fov_start+(s.fov_end-s.fov_start)*t/s.duration
                if idx>1 and s.transition=="CrossFade" and t<window then
                    local alpha=t/window
                    still.ImageTransparency=alpha
                    if still.Image=="" or not still.IsLoaded then
                        -- Captures can be unavailable: blend camera poses instead.
                        local previous=data.shots[idx-1]
                        frame=previous.path[#previous.path].cf:Lerp(frame,alpha)
                        fov=previous.fov_end+(fov-previous.fov_end)*alpha
                    end
                else still.ImageTransparency=1 end
                local nextShot=data.shots[idx+1]
                if nextShot and nextShot.transition=="CrossFade" and not pending and s.duration-t<=.12 then
                    pending=true
                    local ticket=epoch
                    pcall(function() Capture:CaptureScreenshot(function(id:string)
                        if active and epoch==ticket then captured=id end
                    end) end)
                end
                local strength=.025*s.shake
                cam.CFrame=frame*CFrame.Angles(strength*math.noise(elapsed*7,1),strength*math.noise(elapsed*7,2),0)
                cam.FieldOfView=math.clamp(fov,1,120)
                label.MaxVisibleGraphemes=if opts.Typewriter then math.floor(t*(opts.CharactersPerSecond or 36)) else -1
            end
            refresh=function() current=0; epoch+=1; captured=nil; draw(); animateObjects(); animateRig() end
            table.insert(undo,function() epoch+=1; refresh=nil; if fade then fade:Cancel(); fade=nil end end)
            draw(); animateObjects(); animateRig()
            connect(Run.Heartbeat,animateObjects)
            -- Animator writes before PreSimulation. Reapply even while paused to hold the pose.
            local jointConnection=Run.PreSimulation:Connect(function() if active then guarded(animateRig) end end)
            table.insert(undo,function() jointConnection:Disconnect() end)
            connect(Run.RenderStepped,function(dt)
                elapsed=math.min(total,elapsed+dt)
                draw()
                if elapsed>=total then finish("Completed") end
            end)
        end)
    end
    function api:Pause() if active then paused=true; if fade then fade:Pause() end end end
    function api:Resume() if active and paused then paused=false; if fade and fade.PlaybackState==Enum.PlaybackState.Paused then fade:Play() end end end
    function api:SkipTo(i:number)
        assert(starts[i],"Shot index must be 1 to "..#starts)
        if active and refresh then elapsed=starts[i]; guarded(refresh) end
    end
    function api:Stop() finish("Stopped") end
    function api:Destroy() disposed=true; finish("Stopped"); completed:Destroy() end
    return api
end
return Player
