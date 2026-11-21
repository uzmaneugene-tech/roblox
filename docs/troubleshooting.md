<!-- coderabbit-ai-generated:v1 -->

# Troubleshooting

| Symptom | Fix |
|---|---|
| 1. No panel | Enable the add-on in Preferences. Press N with the mouse over the 3D Viewport. |
| 2. No shots or unexpected order | Use camera **object** names starting with capital Shot. Shot2 precedes Shot10. Use unique names, including linked objects. |
| 3. Caption assignment fails | Select the correct Text and count blank lines. Check the numeric camera order. |
| 4. Camera sideways, tiny or offstage | Run Test Conversion on an unparented mesh first. Align both world origins and check studs per unit. Avoid mirrored parents. Camera local −Z should point at the subject. |
| 5. Zoom or framing differs | Match the viewport aspect to the Blender render. Use a perspective camera with zero lens shift. Check FOV overrides and the 1–120° playback range. |
| 6. Shot or prop stays still | Put keys inside the shot's timeline interval. Select animated props for export. Anchor the Studio part, then replace the old data module. |
| 7. Missing or ambiguous target | Check Studio Output for the name. Ensure names are unique, the rig exists and streamed targets are present on the client before Play. |
| 8. Elbow twists or rig root stays still | Match the motor name and align its joint frame to the converted bone rest axes. Bones export rotation only. Animate a separate root part for travel. |
| 9. Module error or nothing starts | Use Play. Check the LocalScript's location. Replace default module source completely. Put numbered parts inside CutsceneData and use files from the same export. |
| 10. Camera or controls fight another script | Temporarily disable competing camera, movement or animation scripts. Test both Stop and natural completion. Custom ScreenGuis are managed by their owners. |

## Known limitations and assumptions

- Rebuild meshes, materials, lighting, audio, particles and effects in Studio. Animated scale, lens shift, depth of field, geometry deformation and compositing do not transfer. Avoid shear and negative scale.
- Sampling can miss very fast movement or visibility changes. Higher rates cost memory and source size. Long exports run in memory and may temporarily make Blender unresponsive.
- Cut switches instantly. Fade reveals the new shot from black. CrossFade dissolves a temporary capture near the outgoing shot's end over the incoming shot. If the capture is unavailable or late, the player blends camera poses instead. This does not render two live moving cameras simultaneously.
- Use anchored cinematic props. Physics, streaming and other controllers can overwrite local changes. Camera control returns to Custom. Character hiding covers BaseParts; attached special effects and custom UI can remain visible.
- Rig playback assumes matching rest axes and hierarchy. There is no general skeleton retargeting, bone translation, root motion track, or mixing with uploaded animations.
- Playback interpolates the two endpoint FOV angles; intermediate lens keys are not baked. The player does not crop the viewport or force device orientation. Check a portrait recording on the intended device before publishing.
