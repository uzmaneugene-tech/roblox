<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f4734c979079bf974ae3ac695479e26d09963fa74a6491cefa43bf32911d1083 -->

# Framecut · Roblox Cinematic Studio

Write and animate Story Code in the browser, or create Roblox camera sequences with the Blender and Luau tools. The site is static. Story scripts, audio, and exports stay on your device.

![Studio overview](docs/studio.png)

[Phone shot editor screenshot](docs/builder-mobile.png) · [Blender beginner guide](docs/guide.md) · [Troubleshooting](docs/troubleshooting.md)

## Story Studio

1. Open **Story Studio → Load sample → Run**, or paste your own synchronous Story Code. The browser saves the current draft and up to 10 distinct versions.
2. Use **Play** or scrub the timeline to preview the story. Open **Cheatsheet → Copy cheatsheet** for the API and an example that uses every option.
3. Under **Export video**, choose **1080 × 1920** or **720 × 1280**. Optionally add an MP3, WAV, or M4A voiceover, set its start offset in seconds, and enable placeholder sound effects.
4. Press **Export video**, then **Download video**. The browser exports portrait video at 30 fps. WebCodecs creates every frame at its exact timeline time. H.264 MP4 is preferred, with AAC for audio. If unavailable, the site tries exact-timing WebM, then real-time WebM recording as a last fallback.

The browser must support the codec and have enough memory for the selected resolution. Keep the tab open until export finishes. For large stories or lower memory phones, use 720p or split the story. Audio uploads are limited to 30 MB and trimmed to the video duration. Read the [Story Code reference](docs/story-code.md) for examples and export details.

## Use the Roblox and Blender tools

1. Open the site and select **Shot Builder**. Add, edit, duplicate or reorder shots. Valid changes are saved in this browser. Download project JSON to back up your work or move it to another device; use **Import project JSON** to restore it.
2. Open **Caption Writer**, enter one line per shot and assign them. Blank lines are silent. Back in the builder, choose **Generate Luau**, then copy or download the modules.
3. To convert Blender's exported version-1 JSON, use **JSON Converter**. The builder's project import accepts Framecut project JSON, which is a different format. Large converter files can be selected with the file picker (32 MiB maximum).
4. In Roblox Studio, put **CutscenePlayer** and the generated **CutsceneData** ModuleScripts under ReplicatedStorage. If the generator creates numbered parts, put them inside CutsceneData. Put **StartCutscene.client.lua** in a LocalScript under StarterPlayer → StarterPlayerScripts. The guide on the site contains download links and the complete instructions.
5. For Blender, download the add-on zip from the site. In Preferences → Add-ons, choose **Install** or **Install from Disk**, select the zip and enable Roblox Cinematic. Press N in the viewport and open its tab.

## Create a GitHub repository and upload the project

You need a GitHub account. For free GitHub Pages hosting, create a **public** repository. First download this project from its GitHub page with **Code → Download ZIP**.

### On a computer

1. Extract the downloaded ZIP. The extracted folder should contain `web`, `docs`, `blender-addon`, `roblox`, and `.github`.
2. On GitHub, choose **+ → New repository**. Name it, for example, `roblox-cinematic-studio`, select **Public**, leave the options to add a README, license and gitignore unchecked, then select **Create repository**.
3. Install Git if needed, open a terminal in the extracted folder and run the commands below. When prompted, paste the HTTPS repository URL displayed on your new repository page. Sign in when Git asks.

   ```sh
   git init -b main
   git add .
   git commit -m "Add Framecut"
   printf "Paste your repository HTTPS URL: "
   read -r REPO_URL
   git remote add origin "$REPO_URL"
   git push -u origin main
   ```

4. Refresh your repository page. Confirm that `web/index.html` and `.github/workflows/pages.yml` are present.

### On a phone browser

This method uses GitHub Codespaces and requires available Codespaces access and quota. Turn on **Request desktop site** in your browser if controls are hidden.

1. Download this project's ZIP using **Code → Download ZIP**. On GitHub, create a **public** repository and select **Add a README file**, then **Create repository**. This creates its `main` branch.
2. In the new repository, choose **Code → Codespaces → Create codespace on main**. Wait for the browser editor. In Explorer, open the repository root's menu and choose **Upload**, then select the downloaded ZIP. Rename the uploaded file to `project.zip` in Explorer.
3. Choose **Terminal → New Terminal**. In the repository terminal run:

   ```sh
   upload_dir=$(mktemp -d)
   unzip -q project.zip -d "$upload_dir"
   cp -a "$upload_dir"/*/. .
   rm project.zip
   git add .
   git commit -m "Add Framecut"
   git push origin main
   ```

4. Return to your repository on GitHub and check for `web/index.html` and `.github/workflows/pages.yml`. Stop the Codespace when finished.

## Turn on GitHub Pages

1. Open your repository on GitHub. Select **Settings → Pages** (on a phone, use the repository menu or request the desktop site).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and select **Deploy GitHub Pages**. A push to `main` starts the workflow. If the earlier run finished before Pages was enabled, select **Run workflow**, choose `main`, and run it again. Wait for it to finish successfully.
4. Return to **Settings → Pages** to find the live URL. For a project repository it normally looks like `https://your-username.github.io/your-repository/`. Open the URL shown by GitHub, including the repository name and trailing slash.

## Update the site later

Edit files on GitHub with the pencil button, or change them on your computer and push to `main`. On a phone you can also reopen the Codespace, edit files, then use `git add .`, `git commit -m "Update site"`, and `git push origin main` in its terminal. Each push to `main` runs the Pages workflow; check **Actions** for its result and refresh the live site.

Edit the guide and troubleshooting text in `docs/`. The workflow copies those files into `web/docs/` when it publishes, and copies the add-on zip and Roblox scripts into `web/downloads/`. To preview source changes locally before deployment, copy those files into the matching `web/` folders as well. Keep the checked-in copies up to date when distributing the project as a ZIP.

## Preview and test locally

Serve the `web` folder with any static HTTP server; opening `index.html` directly as a `file://` URL does not support the module, worker and fetch requests used by the site. For example, from the project folder with Python installed:

```sh
python3 -m http.server 8000 --directory web
```

Open `http://localhost:8000/`. The site serves Three.js, the Story Code sandbox, the video muxer, and the Markdown renderer as local assets. No third-party services or uploads are required. To run the automated tests, install Node.js and run `npm ci` followed by `npm test`. For the optional Railway configuration, use `npm start`; it serves the same static assets and provides a health check.

## Project map and limitations

- `web/`: published website, browser tools, documentation copies and downloads.
- `docs/`: source guide, troubleshooting and screenshots.
- `blender-addon/`: Blender add-on and installable ZIP.
- `roblox/`: Luau player and starter LocalScript.
- `.github/workflows/pages.yml`: Pages deployment.
- `tests/`: format, sandbox, motion, and deterministic exporter frame checks.

Projects are stored per browser and site origin; clearing browser data can remove them, so keep JSON backups. The browser preview is a framing reference, not a Roblox renderer. Blender materials, lighting and effects do not transfer; recreate the stage in Studio. The builder creates fixed camera poses; use Blender for animated paths, objects and bones. Test playback and phone recording before publishing.

MIT-licensed. See LICENSE. Third-party notices are in `web/story/vendor/`. The bundled Mediabunny 1.66.2 browser build is provided under MPL-2.0; [the matching source is in its published package](https://registry.npmjs.org/mediabunny/-/mediabunny-1.66.2.tgz).

<!-- /coderabbit-ai-generated:v1 -->