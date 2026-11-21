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
| `s.sfx(t, name)` | `s.sfx(1,"buzzer")` | Plays a procedural sound in preview and export. |

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
2. Optionally choose a voiceover file (MP3, WAV, or M4A) and enter its start in seconds. Keep Include effects, ambience and music selected to mix generated audio into the export.
3. Press **Export video**. Keep the tab open; progress shows an estimate and can be cancelled.
4. Press **Download video** after encoding completes.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:9dcfb9c02d6f1c9329551555e1daf201cf1fd6adf86530e76fe7fbb7e00cee51 -->

Video and audio stay on the device. WebCodecs exports each frame at its exact timeline time. MP4 uses AAC when available, then Opus if the browser can play that combination. Otherwise the site tries a WebCodecs WebM export. The last fallback uses MediaRecorder in real time, so frame timing can vary. Voiceover decoding depends on the browser, and audio is trimmed to the end of the video. The voiceover limit is 30 MB. Large exports can hit browser memory limits; try 720p or split the story. The preview builds and releases sets one scene at a time.

## Phase 2: Sound, effects and weather

**Try it:** In Story Studio, click **Load sound and effects sample**, **Run**, then **Play**. The sample covers every effect, sound, loop, transition, weather type and new action. Open **Sound mixer** to mute playback/export or adjust the four audio levels. Press Run or Play to enable audio on mobile. Imported voiceover keeps its absolute export offset; procedural cues and loops follow scene time.

| Call or option | Example | Details |
|---|---|---|
| `s.sfx(t,name)` | `s.sfx(1,"ding")` | Plays a procedural cue; legacy custom cue names still produce a short tone. |
| `s.ambience(name,{volume})` | `s.ambience("crickets",{volume:.4})` | One background loop per scene; volume 0–1. |
| `s.music(name,{volume,fadeIn})` | `s.music("calm",{volume:.6,fadeIn:1})` | One generated music loop per scene; fadeIn in seconds; scene boundaries fade the loops. |
| `s.fx(t,name,opts)` | `s.fx(2,"hearts",{target:jin,duration:2,intensity:1.5})` | Use `target` or `position:[x,y,z]`; duration in seconds, intensity 0–3. |
| `s.bubble(t,char,text,opts)` | `s.bubble(1,jin,"Hi!",{kind:"speech",duration:2})` | Kinds: speech, thought, exclaim. Attaches above the head. |
| `s.title(t,text,opts)` | `s.title(0,"Chapter One",{sub:"After dark",style:"chapter",duration:2})` | Styles: big, lowerthird, chapter. |
| `s.transition(t,name,{duration})` | `s.transition(3,"whip_pan",{duration:.7})` | Plays an effect that peaks halfway through the interval. |
| Scene edges | `{location:"backyard_party",time:"day",duration:7,transitionIn:"fade_white",transitionOut:{name:"iris",duration:1}}` | A transition name or `{name,duration}`; defaults to .45 s. |
| `s.slowmo(t,duration,factor)` | `s.slowmo(2,1,.5)` | Plays one source second at half speed in two output seconds. Audio slows with the scene, including pitch. |
| `s.freeze(t,duration)` | `s.freeze(4,.6)` | Inserts a still; music and ambience continue during the still. Don't overlap timing edits. The playback/export length changes; authored cue times stay in story seconds. |
| Scene weather | `{location:"basketball_court",time:"day",duration:7,weather:"storm"}` | Options: rain, snow, fog, storm, clear. Storm has localized flashes and thunder. |
| `s.timeOfDay(t,time,{duration})` | `s.timeOfDay(2,"night",{duration:3})` | Day, dusk, night. Blends sky, scene lighting, fog and glows. |

### Sound effects

| Name | Example |
|---|---|
| whoosh | `s.sfx(1,"whoosh")` |
| door_open | `s.sfx(1,"door_open")` |
| door_close | `s.sfx(1,"door_close")` |
| buzzer | `s.sfx(1,"buzzer")` |
| cheer | `s.sfx(1,"cheer")` |
| clap | `s.sfx(1,"clap")` |
| pop | `s.sfx(1,"pop")` |
| ding | `s.sfx(1,"ding")` |
| coin | `s.sfx(1,"coin")` |
| thud | `s.sfx(1,"thud")` |
| step | `s.sfx(1,"step")` |
| camera_click | `s.sfx(1,"camera_click")` |
| gasp | `s.sfx(1,"gasp")` |
| sad_trombone | `s.sfx(1,"sad_trombone")` |
| swoosh_fast | `s.sfx(1,"swoosh_fast")` |
| hoop | `s.sfx(1,"hoop")` |
| elevator_ding | `s.sfx(1,"elevator_ding")` |
| phone_ring | `s.sfx(1,"phone_ring")` |
| heartbeat | `s.sfx(1,"heartbeat")` |
| boom | `s.sfx(1,"boom")` |

### Ambient loops

| Name | Example |
|---|---|
| city_night | `s.ambience("city_night",{volume:.5})` |
| crickets | `s.ambience("crickets",{volume:.5})` |
| party_crowd | `s.ambience("party_crowd",{volume:.5})` |
| wind | `s.ambience("wind",{volume:.5})` |
| rain | `s.ambience("rain",{volume:.5})` |
| office_hum | `s.ambience("office_hum",{volume:.5})` |
| none | `s.ambience("none",{volume:.5})` |

### Generated music

| Name | Example |
|---|---|
| calm | `s.music("calm",{volume:.5,fadeIn:.4})` |
| tense | `s.music("tense",{volume:.5,fadeIn:.4})` |
| happy | `s.music("happy",{volume:.5,fadeIn:.4})` |
| sad | `s.music("sad",{volume:.5,fadeIn:.4})` |
| epic | `s.music("epic",{volume:.5,fadeIn:.4})` |
| none | `s.music("none",{volume:.5,fadeIn:.4})` |

### Particle effects

| Name | Example |
|---|---|
| confetti | `s.fx(1,"confetti",{position:[0,3,0],duration:2,intensity:1})` |
| rain | `s.fx(1,"rain",{position:[0,3,0],duration:2,intensity:1})` |
| snow | `s.fx(1,"snow",{position:[0,3,0],duration:2,intensity:1})` |
| smoke | `s.fx(1,"smoke",{position:[0,3,0],duration:2,intensity:1})` |
| sparks | `s.fx(1,"sparks",{position:[0,3,0],duration:2,intensity:1})` |
| hearts | `s.fx(1,"hearts",{position:[0,3,0],duration:2,intensity:1})` |
| money_rain | `s.fx(1,"money_rain",{position:[0,3,0],duration:2,intensity:1})` |
| stars | `s.fx(1,"stars",{position:[0,3,0],duration:2,intensity:1})` |
| fireworks | `s.fx(1,"fireworks",{position:[0,3,0],duration:2,intensity:1})` |
| dust | `s.fx(1,"dust",{position:[0,3,0],duration:2,intensity:1})` |

### Transitions

| Name | Example |
|---|---|
| fade_black | `s.transition(2,"fade_black",{duration:.5})` |
| fade_white | `s.transition(2,"fade_white",{duration:.5})` |
| whip_pan | `s.transition(2,"whip_pan",{duration:.5})` |
| flash | `s.transition(2,"flash",{duration:.5})` |
| iris | `s.transition(2,"iris",{duration:.5})` |
| glitch | `s.transition(2,"glitch",{duration:.5})` |

### Weather

| Name | Example |
|---|---|
| rain | `scene("Weather",{location:"empty",time:"day",duration:5,weather:"rain"},s=>{})` |
| snow | `scene("Weather",{location:"empty",time:"day",duration:5,weather:"snow"},s=>{})` |
| fog | `scene("Weather",{location:"empty",time:"day",duration:5,weather:"fog"},s=>{})` |
| storm | `scene("Weather",{location:"empty",time:"day",duration:5,weather:"storm"},s=>{})` |
| clear | `scene("Weather",{location:"empty",time:"day",duration:5,weather:"clear"},s=>{})` |

### Action poses

| Name | Example |
|---|---|
| hold | `s.do(1,jin,"hold","phone")` |
| hug | `s.do(1,jin,"hug",kai)` |
| dance | `s.do(1,jin,"dance","shuffle")` |
| cry | `s.do(1,jin,"cry")` |
| laugh | `s.do(1,jin,"laugh")` |
| push | `s.do(1,jin,"push",kai)` |
| pick_up | `s.do(1,jin,"pick_up","letter")` |
| give | `s.do(1,jin,"give",kai)` |
| phone_call | `s.do(1,jin,"phone_call")` |
| point | `s.do(1,jin,"point")` |
| bow | `s.do(1,jin,"bow")` |
| clap | `s.do(1,jin,"clap")` |
| salute | `s.do(1,jin,"salute")` |
| nod | `s.do(1,jin,"nod")` |
| shake_head | `s.do(1,jin,"shake_head")` |
| shrug | `s.do(1,jin,"shrug")` |
| stretch | `s.do(1,jin,"stretch")` |
| sleep | `s.do(1,jin,"sleep")` |
| kneel | `s.do(1,jin,"kneel")` |
| crawl | `s.do(1,jin,"crawl")` |
| backflip | `s.do(1,jin,"backflip")` |
| kick | `s.do(1,jin,"kick")` |
| punch_air | `s.do(1,jin,"punch_air")` |

### Held items

| Name | Example |
|---|---|
| phone | `s.do(1,jin,"hold","phone")` |
| briefcase | `s.do(1,jin,"hold","briefcase")` |
| cup | `s.do(1,jin,"hold","cup")` |
| letter | `s.do(1,jin,"hold","letter")` |
| ball | `s.do(1,jin,"hold","ball")` |
| money | `s.do(1,jin,"hold","money")` |
| flag | `s.do(1,jin,"hold","flag")` |
| microphone | `s.do(1,jin,"hold","microphone")` |
| umbrella | `s.do(1,jin,"hold","umbrella")` |

For dance, use `"shuffle"`, `"robot"` or `"spin"`. Hold an item before `give`, and place the recipient within reach. Use character handles for hug, push and give. The held items are also standalone library props, for example `s.spawn("phone",[0,0,0],{color:"#28364d"})`.



<!-- /coderabbit-ai-generated:v1 -->


<!-- /coderabbit-ai-generated:v1 -->