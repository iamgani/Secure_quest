# Secure Quest — Mobile-focused Web Game (PWA-ready)

## Files
- `index.html`, `styles.css`, `main.js` — core app
- `manifest.json`, `sw.js` — PWA
- `assets/` — images & audio (place `interface.png`, `building_real.png`, `security_area.png`, `iris_door.png`, `desk_area.png`, `icon-192.png`, `icon-512.png`, optionally `music_bg.mp3`, `sfx_success.mp3`, `sfx_fail.mp3`)

## Quick local test (LAN)
```bash
# from project root
python -m http.server 8000
# or
npx http-server -p 8000
