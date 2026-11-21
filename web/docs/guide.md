<!-- coderabbit-ai-generated:v1 -->

# Your first vertical Roblox cinematic

## Install

Download the add-on zip from the home page (or use blender-addon/roblox_cinematic_exporter.py). Open Blender → Edit → Preferences → Add-ons. Choose **Install** (older versions) or the small menu → **Install from Disk** (newer versions). Select the downloaded zip or .py file and enable Roblox Cinematic. Save your .blend. In the 3D Viewport press **N** and open the **Roblox Cinematic** tab.

## Set up a four-second scene

1. In Output Properties use **1080 × 1920**, 100%, square pixels, and 24 fps. Start at frame 1. The default conversion is 3.571 studs per Blender unit.
2. Rename a perspective camera **Shot1**. Aim it at your subject. Duplicate it as **Shot2** and move closer. Select each camera to edit its sidebar settings. Leave Duration at 2 seconds and give each a caption and color. Set Shot2 to Fade with 0.35 seconds.
3. All shots share one timeline. At 24 fps Shot1 uses frames 1–49; Shot2 uses frames 49–97. To move Shot2, insert location and rotation keys on that camera at 49 and 97. Set a smaller ending FOV for a zoom in. Zero reads the lens at that endpoint. Reduce the camera frame step for tighter curves.
4. To write many captions, open Blender's Text Editor → New. Enter one line per shot, choose the text under Captions and click **Assign caption lines**. The counts must match. Interior blank lines are silent captions. You can leave a camera caption empty.
5. Optional prop: name a cube **StoryBox**, key its location at frames 1 and 49 and leave it selected for export. Key the object's global viewport or render disable flags (hide_viewport / hide_render) for visibility. The temporary Outliner eye toggle is different. Hidden exports as transparency 1; visible as 0. Choose 30 or 60 animation samples per second. Compression compares poses rounded to four decimals and keeps the ends of holds.
6. Check coordinates: select an unrotated mesh at (1, 2, 3), click **Test Conversion**, and look in the system console (Windows: Window → Toggle System Console; macOS/Linux: launch Blender from a terminal). Expect position **(3.571, 10.713, −7.142)** and identity rotation. Mesh rotation changes basis on both sides. Cameras compensate for their local optical axes: a camera rotated +90° about Blender X points toward Blender +Y, which is Roblox −Z.
7. Optional rig: choose an armature under Rig Animation, enter the exact Studio model name, and click **Auto map R15**. Left is the Blender bone; right is the Studio **Motor6D name**, not the limb part. For example, UpperTorso drives Waist, and Head drives Neck. HumanoidRootPart has no incoming motor, so its target is blank. Change mismatches such as Root versus RootJoint, blank either field to skip a joint, or add a custom row. Auto map replaces the table. Test a single elbow bend first: motor joint axes must match the converted local rest axes of the Blender bone. Matching names alone cannot align two skeletons.

## Export

Select your animated props, choose a dedicated **Output folder**, and click **Export Luau**. Cameras and the chosen armature do not need to be selected. The exporter restores your frame and reports shot, prop and bone counts, source characters, and runtime.

A normal export creates CutsceneData.lua. Large exports also create Part1.lua, Part2.lua, etc. Each module fits within 190,000 ASCII characters. The loader applies numbered pieces in order. Use only parts referenced by the current loader. **Copy to Clipboard** copies the main module; for split data it also writes all modules to the output folder. **Export JSON** gives you numeric arrays for inspection or other tools. Use Luau for this player.

## Import into Studio

1. Open your place and show Explorer and Output. Recreate your stage. If you exported StoryBox, put an anchored Part named **StoryBox** in Workspace. Each exported part name must be unique across Workspace, including descendants.
2. Under **ReplicatedStorage**, insert two **ModuleScripts** named exactly **CutsceneData** and **CutscenePlayer** (no .lua). Open the corresponding files as text and replace each module's entire default source. For split data, insert each numbered ModuleScript **inside CutsceneData** and name it Part1, Part2, etc.
3. For rig playback, put the uniquely named R15 model in Workspace. Confirm its Motor6D names in Explorer. Prefer a stationary dummy with an anchored root and no competing controllers. Roblox's native animation asset / KeyframeSequence upload workflow is separate: this player writes Motor6D.Transform locally. No animation upload or ID is needed.
4. Under **StarterPlayer → StarterPlayerScripts**, insert a **LocalScript** called **StartCutscene** and replace its contents with StartCutscene.client.lua.

## Test and record

Click **Play** so a local player spawns. Expect Shot1 and its caption, a closer Shot2 after two seconds, and normal controls after four seconds. Play again and press Space or tap an unused area on mobile to stop early. Use Studio's device emulator to choose a portrait phone. Check framing, caption clearance and controls after stopping before recording.

The example enables typewriter text, hides supported CoreGui elements, and hides character parts. Change HideUI, HideCharacter or Typewriter to false to disable an option. CharactersPerSecond defaults to 36. On the instance returned by new, call :Play(), :Pause(), :Resume(), :SkipTo(2) or :Stop(). Connect to .Completed before :Play(); it supplies “Completed”, “Stopped” or “Error”. :Destroy() releases the event. Only one player can own the camera at a time.
