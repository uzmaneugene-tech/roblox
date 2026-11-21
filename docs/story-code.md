<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5fb3eafe6d841d83760dd160005080e94a5635ac63e4d3661fa42d36f29a5d69 -->

# Story Code reference

In **Story Studio**, choose **Load sample**, then **Run**. Story Code is synchronous JavaScript. Time values are seconds from the start of the scene, coordinates are `[x, y, z]` in studs (Y is up), and each scene starts with fresh placements.

```js
story({ title: "Practice", aspect: "9:16", fps: 30 });
const jin = character("Jin", {
  skin: "#f1c9a5", hair: "#16161a",
  outfit: { shirt: "#4aa3e8", pants: "#1f2a52", shoes: "#ffffff", hat: "beanie", shirtText: "HOME" }
});
scene("Practice", { location: "basketball_court", time: "dusk", duration: 5 }, s => {
  s.place(jin, [0, 0.1, 3]);
  s.cam(0, "wide", { target: jin });
  s.do(1, jin, "wave");
  s.say(1, jin, "Welcome to practice", { speed: 2 });
  s.narrate(3, "The game begins");
});
```

## Scene API

| Call | Example | Notes |
|---|---|---|
| `s.place(char, position)` | `s.place(jin, [0,.1,3])` | Places a character for this scene. |
| `s.prop(type, position, options?)` | `s.prop("sign", [2,0,-4], {text:"HOME", color:"#2e65a0", rotate:90, scale:1.2})` | Rotation is degrees around Y or XYZ degrees. Scale accepts a scalar or three axes. Color and text apply to props that display them. |
| `s.do(t, char, action, arg?)` | `s.do(1, jin, "walk_to", [2,.1,3])` | New actions blend from the current pose. |
| `s.cam(t, shot, options?)` | `s.cam(2, "close_up", {target:jin, ease:.6})` | Between shots the camera eases by default. |
| `s.say(t, char, text, options?)` | `s.say(3, jin, "Ready to play", {speed:2})` | One word at a time; no speaker name. |
| `s.narrate(t, text, options?)` | `s.narrate(4, "Later that night", {speed:3})` | Same treatment as dialogue. `speed` is words per second (default 3). A new line replaces the current line. |
| `s.light(options)` | `s.light({color:"#ffd9ad", intensity:2, ambient:1.2})` | Optional lighting override. |
| `s.sfx(t, name)` | `s.sfx(1,"buzzer")` | Records a sound cue; preview has no sound playback. |

## Actions

| Action | Mini example |
|---|---|
| Idle | `s.do(0,jin,"idle")` |
| Walk to | `s.do(1,jin,"walk_to",[3,.1,2])` |
| Run to | `s.do(3,jin,"run_to",[9,.1,2])` |
| Turn to | `s.do(4,jin,"turn_to",90)` or `s.do(4,jin,"turn_to",[9,0,2])` |
| Wave | `s.do(5,jin,"wave")` |
| Jump | `s.do(6,jin,"jump")` |
| Shout | `s.do(7,jin,"shout")` |
| Emote | `s.do(8,jin,"emote","shocked")` |
| Shoot ball | `s.do(9,jin,"shoot_ball")` (nearest hoop) or `s.do(9,jin,"shoot_ball",[13.31,6.67,0])` |
| Sit | `s.do(10,jin,"sit")` (place or move the character to a seat first) |
| Celebrate | `s.do(11,jin,"celebrate")` |
| Fall | `s.do(12,jin,"fall")` |

Face names: `happy`, `shocked`, `sad`, `angry`, `shouting`.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5871d8571070f3b79e01203417d0d91f26afe6eaeb8dc51ec2d1ec0c98fffdbf -->

## Scene Tools and the final frame

Open **Story Studio → Scene Tools** after Run. Tap geometry to see world coordinates and the nearest prop. Drag to look; pinch to move along the viewing direction, drag with two fingers to move sideways or vertically, or use Up/Down. Turn on the grid to see one-stud spacing and a five-stud ruler at the marker. **Save as shot** copies a static camera line at the current time within the scene. **Place helper** copies a placement on each tap: choose a character variable for `s.place` or a library name for `s.spawn`. Return to the story camera before reviewing playback. Debug copies the current state and downloads a frame PNG. Editor guides are excluded from PNG and video.

| Scene call | Example |
|---|---|
| Set the color grade | `s.grade("warm_dusk")` — also accepts `"cold_night"`, `"bright_day"`, or `"neutral"`. |
| Soften the image around a character | `s.dof({focus:jin,amount:.3})` — use a character handle and an amount from 0 to 1. Zero disables softening. |

Story characters blink and articulate each spoken word. Narration has no speaker. Low, Medium and High select render detail. Preview lowers detail if several frames exceed the story's frame budget; export takes the effective quality at the moment it starts. Film grain is optional and follows timeline time when scrubbing or exporting.

## Camera


<!-- /coderabbit-ai-generated:v1 -->
| Shot | Mini example |
|---|---|
| Wide | `s.cam(0,"wide",{target:jin})` |
| Medium | `s.cam(2,"medium",{target:jin})` |
| Close up | `s.cam(4,"close_up",{target:jin,face:true})` |
| Tracking | `s.cam(6,"tracking",{target:jin,side:"left"})` |
| Over shoulder | `s.cam(8,"over_shoulder",{target:jin,side:"right"})` |
| Low angle | `s.cam(10,"low_angle",{target:jin,shake:.15})` |
| Static | `s.cam(12,"static",{from:[4,4,10],look:[0,2,0],cut:true})` |

Options: `target` selects a placed character. `from` and `look` override the computed camera position and aim. `face:false` reverses the character-relative view. `side` is `"left"` or `"right"`. `ease` is transition duration in seconds; `cut:true` switches instantly. `shake` adds camera vibration, and shouts add a brief pulse. Default portrait FOV depends on the shot; see the Library camera distance table.

## Locations

| Location | Mini example |
|---|---|
| Neighborhood street | `scene("Street",{location:"neighborhood_street",time:"day",duration:8},s=>{})` |
| Backyard party | `scene("Party",{location:"backyard_party",time:"dusk",duration:8},s=>{})` |
| Basketball court | `scene("Court",{location:"basketball_court",time:"night",duration:8},s=>{})` |
| House interior | `scene("Home",{location:"house_interior",time:"dusk",duration:8},s=>{})` |

## Props

| Prop | Mini example |
|---|---|
| House | `s.prop("house",[10,0,-8],{color:"#ec98ac"})` |
| Tree | `s.prop("tree",[8,0,-4],{scale:.8})` |
| Lamp | `s.prop("lamp",[1,0,-5],{rotate:90})` |
| Fence | `s.prop("fence",[4,0,-5],{scale:[2,1,1]})` |
| Car | `s.prop("car",[4,0,3],{color:"#62c8ac",rotate:90})` |
| Bleachers | `s.prop("bleachers",[0,0,-10])` |
| Hoop | `s.prop("hoop",[12,0,0],{rotate:-90})` |
| Ball | `s.prop("ball",[1,.1,4],{color:"#ff864c"})` |
| Banner | `s.prop("banner",[0,2,-6],{text:"SUMMER PARTY GAME"})` |
| Bunting | `s.prop("bunting",[0,0,-6],{color:"#ffb857"})` |
| String lights | `s.prop("string_lights",[0,0,-4],{scale:1.15})` |
| Balloons | `s.prop("balloons",[-4,0,3])` |
| Cake table | `s.prop("cake_table",[-4,0,4])` |
| Pool | `s.prop("pool",[6,0,4],{color:"#58d4ee"})` |
| Scoreboard | `s.prop("scoreboard",[5,0,-7],{text:"HOME 50"})` |
| Bench | `s.prop("bench",[3,0,1])` |
| Door | `s.prop("door",[2,0,0],{color:"#597ab0"})` |
| Sign | `s.prop("sign",[0,0,5],{text:"ENTRY"})` |

## One-line option examples

| Option | Example |
|---|---|
| `title`, `aspect`, `fps` | `story({title:"Practice",aspect:"9:16",fps:30})` (video export uses 9:16 and 30 fps) |
| `skin`, `hair` | `character("Jin",{skin:"#f1c9a5",hair:"#16161a"})` |
| `outfit.shirt`, `pants`, `shoes` | `character("Maya",{outfit:{shirt:"#ef648e",pants:"#29264d",shoes:"#fbfbff"}})` |
| `outfit.hat`, `shirtText` | `character("Maya",{outfit:{hat:"party hat",shirtText:"TEAM"}})` (also `"beanie"`) |
| `location`, `time`, `duration` | `scene("Practice",{location:"basketball_court",time:"dusk",duration:8},s=>{})` |
| Prop `color`, `text` | `s.prop("sign",[1,0,1],{color:"#265984",text:"ENTRY"})` |
| Prop `rotate`, `scale` | `s.prop("bench",[1,0,1],{rotate:[0,90,0],scale:[1.2,1,1]})` |
| Camera `from`, `look` | `s.cam(0,"static",{from:[7,5,12],look:[1,2,0]})` |
| Camera `target`, `face`, `side` | `s.cam(2,"tracking",{target:jin,face:true,side:"left"})` |
| Camera `ease`, `cut`, `shake` | `s.cam(4,"medium",{ease:.8,cut:false,shake:.2})` |
| Caption `speed` | `s.narrate(4,"Play resumes",{speed:2})` |
| Light `color`, `intensity`, `ambient` | `s.light({color:"#ffe6bf",intensity:2.3,ambient:1.3})` |

## Time of day and expressions

| Value | Mini example |
|---|---|
| Day | `scene("Morning",{location:"neighborhood_street",time:"day",duration:5},s=>{})` |
| Dusk | `scene("Evening",{location:"backyard_party",time:"dusk",duration:5},s=>{})` |
| Night | `scene("Night",{location:"basketball_court",time:"night",duration:5},s=>{})` |
| Happy | `s.do(0,jin,"emote","happy")` |
| Shocked | `s.do(1,jin,"emote","shocked")` |
| Sad | `s.do(2,jin,"emote","sad")` |
| Angry | `s.do(3,jin,"emote","angry")` |
| Shouting | `s.do(4,jin,"emote","shouting")` |

## All options sample

```js
story({title:"Night practice",aspect:"9:16",fps:30});
const jin = character("Jin", {
  skin:"#f1c9a5", hair:"#16161a",
  outfit:{shirt:"#4aa3e8",pants:"#1f2a52",shoes:"#ffffff",hat:"beanie",shirtText:"HOME"}
});
scene("Court", {location:"basketball_court",time:"night",duration:12}, s => {
  s.place(jin,[0,.1,3]);
  s.prop("banner",[1,3,-7],{color:"#bc4274",text:"NIGHT PRACTICE",rotate:[0,-8,0],scale:[1,1,1]});
  s.light({color:"#ffe2a4",intensity:1.9,ambient:1.1});
  s.cam(0,"wide",{from:[8,8,23],look:[0,3.1,0],target:jin,face:true,side:"right",ease:0,shake:0,cut:true});
  s.narrate(.3,"The court lights up",{speed:2.5});
  s.do(1,jin,"wave");
  s.cam(2,"close_up",{target:jin,face:true,ease:.6,cut:false});
  s.say(2.7,jin,"One more shot",{speed:2});
  s.do(4,jin,"walk_to",[4,.1,2.5]);
  s.cam(4,"tracking",{target:jin,side:"left",ease:.8});
  s.do(7,jin,"shoot_ball",[13.31,6.67,0]);
  s.cam(7,"over_shoulder",{target:jin,ease:.4});
  s.sfx(8.55,"hoop");
  s.do(9,jin,"celebrate");
  s.cam(9,"low_angle",{target:jin,shake:.18,ease:.7});
});
```

## Export a video

1. Run the story. In **Export video**, choose **1080 × 1920** or **720 × 1280**.
2. Optionally choose a voiceover file (MP3, WAV, or M4A) and enter its start in seconds. Enable placeholder sound effects to mix `s.sfx` sound cues into the export.
3. Press **Export video**. Keep the tab open; progress shows an estimate and can be cancelled.
4. Press **Download video** after encoding completes.

Video and audio stay on the device. WebCodecs exports each frame at its exact timeline time. If H.264 or AAC support is missing, the site tries a WebCodecs WebM export. The last fallback uses MediaRecorder in real time, so frame timing can vary. Voiceover decoding depends on the browser, and audio is trimmed to the end of the video. The voiceover limit is 30 MB. Large exports can hit browser memory limits; try 720p or split the story. The preview builds and releases sets one scene at a time.


<!-- /coderabbit-ai-generated:v1 -->