<!-- coderabbit-ai-generated:v1 -->

# Library and camera reference

Open **Library**, choose **New item**, paste one definition, then **Save definition**. Use the name in Story Studio. Custom items live in this browser's IndexedDB. Export your library to transfer it to another phone. JSON and JavaScript exports include your definitions; the built-in collection ships with the site. JavaScript imports accept one definition or a Framecut multi-item export. Importing replaces custom items of the same name. Bundled names are reserved. Rename a bundled definition to make a variation.

## Define a building block

```js
define.prop("crate", (b,o)=>b.box({color:o.color??"#bf8961"}));
define.building("stack", (b,o)=>b.repeat(o.floors??3,i=>b.use("crate",{pos:[0,i+.5,0]})));
define.location("plaza", (w,o)=>{w.ground({texture:"concrete"});w.use("stack",{floors:6});});
define.character("director", {body:"tall",skin:"light",hair:"short",outfit:{shirt:"#46657e"},accessories:["glasses"]});
define.animation("nod", (rig,t,o)=>{rig.head.rotation.x=.3*Math.sin(t*4);});
```

Save those five lines as separate items. Builder callbacks run synchronously in the Story Code sandbox. Use the builder, not browser globals. A rig has `head, torso, armL, armR, legL, legR`, each with `rotation.x/y/z` in radians. Animation time is seconds; set duration in the action options (default 1 second, up to 30). Pose keys are sampled at 15 Hz and interpolated on playback and export.

## Builders

`b` and `w` have the same helpers. Unit shapes are centered on their origin. Transforms: `pos:[x,y,z]` in studs, `rot:[x,y,z]` in radians, `scale:[w,h,d]` or a positive number. Material options: `color:"#rrggbb", rough:0.65, emissive:"#ffc875", outline:true`. Emissive colors and point lights activate at dusk/night. `slide:[dx,dy,dz]` oscillates a primitive (elevator doors). A group transforms its children together. Item callbacks receive their options and `o.time`. Prefer repeated geometry and use up to four local lights per scene.

| Helper | One-line example |
|---|---|
| box | `b.box({pos:[0,1,0],scale:[2,2,2],color:"#48a599"})` |
| cylinder | `b.cylinder({scale:[1,3,1]})` |
| sphere | `b.sphere({pos:[0,2,0]})` |
| cone | `b.cone({scale:[2,3,2]})` |
| wedge | `b.wedge({rot:[0,.5,0]})` |
| torus | `b.torus({scale:2})` |
| plane | `b.plane({rot:[-Math.PI/2,0,0]})` |
| text | `b.text("Lobby",{pos:[0,3,0],scale:[3,1,1]})` |
| light | `b.light("#ffca82",6,12,{pos:[0,4,0]})` |
| group | `b.group({pos:[0,2,0]}).box({color:"#55a8aa"})` |
| repeat | `b.repeat(4,i=>b.box({pos:[0,i,0]}))` |
| use | `b.use("tower",{floors:7,width:9,depth:8,color:"#7288a5"})` |
| scatter | `w.scatter("rock",{count:8,area:[20,18],seed:4,avoid:[[0,0,3]]})` |
| row | `w.row("bench",{from:[0,0,0],to:[12,0,0],count:3})` |
| grid | `w.grid("bush",{rows:2,cols:3,gap:[3,4],pos:[-6,0,-5]})` |
| ground | `w.ground({color:"#80b287",texture:"grass"})` (grass, asphalt, sand, concrete, water) |
| road | `w.road([[-15,0,0],[15,0,0]],5)` |
| path | `w.path([[0,0,0],[4,0,6]])` |
| sky | `w.sky({time:"dusk"})` (day, dusk, night) |
| fog | `w.fog({color:"#a69baf",near:20,far:110})` |

Scatter uses a seeded generator; area is [width, depth], avoid entries are [x, z, radius]. Rows include both ends. For layouts pass `opts:{color:"#70a9a1"}` to customize every copy. Crowds support rich, poor and kids, with up to 150 NPCs per scene.

## All library options: runnable Story Code

```js
story({title:"From the sidewalk to the roof",aspect:"9:16",fps:30});
const jin=character("Jin",{preset:"jin"});
const boss=character("Boss",{body:"tall",hair:"short",skin:"medium",outfit:{shirt:"#55738a",pants:"#293443",shoes:"#f5f0dd"},accessories:["suit","glasses"]});
scene("Arrival",{location:"city_tower",time:"dusk",duration:12},s=>{
  s.place(jin,[0,0,9]);s.place(boss,[4,0,8]);
  s.spawn("limo",[-6,0,8],{color:"#3d5867",rot:[0,.7,0],scale:1});
  s.scatter("flowers",{count:12,area:[19,15],seed:3,avoid:[[0,0,6]]});
  s.row("bench",{from:[-9,0,7],to:[-3,0,7],count:2});
  s.grid("bush",{pos:[7,0,3],rows:2,cols:3,gap:2});
  s.crowd({count:12,area:[22,16],seed:91,style:"rich"});
  s.do(.5,boss,"salute",{duration:2});s.say(1,boss,"Welcome upstairs");
  s.cam(0,"two_shot",{targets:[jin,boss],fov:58,offset:[0,1,0]});
  s.cam(4,"over_shoulder",{targets:[jin,boss],dist:6,height:5.8,ease:.7});
  s.cam(7,"group",{targets:[boss,jin]});s.cam(9,"crane_up",{target:jin});
});
scene("Roof",{location:"empty",time:"night",duration:5},s=>{
  s.spawn("tower",[0,0,0],{floors:6,width:12,depth:10,color:"#637a9d"});
  s.place(jin,[3,21,2]);s.cam(0,"orbit",{target:jin,dist:14});
});
```

Body: slim (default), normal, tall, kid, big. Hair: messy (Jin), short, long, bald, cap, mohawk; previous hair colors still work. Accessories: glasses, sunglasses, beanie, party_hat, crown, tie, backpack, headphones, suit. Example: `character("Alex",{body:"kid",hair:"mohawk",accessories:["backpack","headphones"]})`.

## Camera distances

Defaults below assume a five-stud actor. Distances scale with body height. FOV is vertical degrees. Explicit `from` and `look` override automatic framing; collision checks still apply. Use `offset:[x,y,z]` to shift the lens in world coordinates.

| Shot | Distance / height / FOV | Example |
|---|---|---|
| wide | 26 / 7 / 53° | `s.cam(0,"wide",{target:jin})` |
| medium | 10 / 3.6 / 103°; full subject about 20% of frame | `s.cam(1,"medium",{target:jin})` |
| close_up | 5 / 4.4 / 94° | `s.cam(2,"close_up",{target:jin})` |
| tracking | 9.5 sideways / 3.6 / 59° | `s.cam(3,"tracking",{target:jin,side:"left"})` |
| over_shoulder | 6 behind / 5.8 / 54°; first actor toward second | `s.cam(4,"over_shoulder",{targets:[jin,boss]})` |
| low_angle | 8 / 1 / 63° | `s.cam(5,"low_angle",{target:jin})` |
| static | 12 / 4.7 / 48° | `s.cam(6,"static",{from:[0,4,14],look:[0,3,0]})` |
| two_shot | at least 11, expands to fit both / 58° | `s.cam(7,"two_shot",{targets:[jin,boss]})` |
| group | at least 15, expands to fit everyone / 62° | `s.cam(8,"group",{})` |
| orbit | 12 / 4 / 57°, rotates around the target | `s.cam(9,"orbit",{target:jin,dist:15})` |
| crane_up | starts 18 / 5 / 58°, rises and pulls back | `s.cam(10,"crane_up",{target:jin,height:6})` |
