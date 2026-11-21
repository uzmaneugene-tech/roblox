#!/usr/bin/env bash
set -euo pipefail
destination=${1:?Usage: prepare-pages.sh OUTPUT_DIRECTORY}
# Use a fresh directory so stale files can't satisfy smoke tests.
mkdir "$destination"
cp -a web/. "$destination/"
mkdir -p "$destination/docs" "$destination/downloads"
cp -R docs/. "$destination/docs/"
cp blender-addon/roblox_cinematic_exporter.zip roblox/*.lua "$destination/downloads/"
