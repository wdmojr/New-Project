# Van Selow Design Build: floor plan walkthrough

A scroll-driven landing page for Van Selow Design Build (Seminole, FL). It opens on a printed floor plan. On scroll, the walls rise out of the drawing and the camera comes down to the front door. It then walks through a finished coastal remodel: foyer, great room, kitchen, then the lanai and pool. Each room stays a line drawing until the camera reaches it, and then its finished materials sweep across it. The page ends on a consultation call to action.

The idea and engine are adapted from [Sam1983Aing/casa-larga](https://github.com/Sam1983Aing/casa-larga), the readable version of [casa-serra](https://github.com/Sam1983Aing/casa-serra).

## Run it

Plain files with no build step. Serve the folder over HTTP, because ES modules don't load from `file://`:

```sh
cd vanselow-walkthrough
python3 -m http.server 8000
# open http://localhost:8000
```

`?capture` turns off smoothing and exposes `window.__frame(s)` so recordings can step through exact scroll positions. `media-walkthrough.mp4` was recorded that way.

## Where things live

| File | What it holds |
| --- | --- |
| `js/plan.js` | Rooms, side rooms, trees, pool, sun, title-block text, and feet/inch formatting |
| `js/house.js` | The building: walls as one solid, roofs, and all furniture per room |
| `js/materials.js` | The ink-to-material shader and every finish (oak floor, navy island, quartz, brass, pool water) |
| `js/rig.js` | The camera path: scroll position to camera, head turns, room reveal triggers |
| `js/sheet.js` | Plan annotations: room names, dimension strings, door swings, title block |
| `js/main.js` | Renderer, lights, scroll timeline, captions, HUD |
| `index.html` | Copy: hero, room captions, closing CTA |

## Scroll map

| Scroll | Stop |
| --- | --- |
| 0 – 3.5 % | 01 Plan sheet |
| 3.5 – 32 % | 02 Walls rise, camera comes down |
| 32 – 43 % | 03 Arrival at the front door |
| 43 – 52 % | 04 Foyer |
| 52 – 69 % | 05 Great room |
| 69 – 86 % | 06 Kitchen / dining |
| 86 – 100 % | 07 Lanai & pool, then 08 the CTA card |

## Before launch

- **Phone number:** the page uses 727-628-2219 from vanselowdesign.com. The CRM lists (727) 391-2959. Confirm which one to use.
- **CTA link:** it points to `https://vanselowdesign.com/contact/`. Confirm that URL.
- **Copy claims:** the awards line (NARI Remodeler of the Year 2025, Best of Florida 2025, Best of Houzz) and the license number come from their website. Have the client sign off.
- **The house is illustrative**, not a real Van Selow project. To show a real one, change the room sizes in `plan.js` and the furniture in `house.js`.
- **Textures:** CC0 scans from Poly Haven (about 12 MB).
