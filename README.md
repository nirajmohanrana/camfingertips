# CamFingertips

A browser-based hand-tracking visualizer that maps live webcam video onto perspective quads between your fingertips. Built with React, TypeScript, and [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker).

Hold your hand in front of the camera and watch filtered video, procedural effects, and perspective text render inside the spaces between adjacent finger tips.

## Features

- **Real-time hand tracking** — Detects up to two hands via webcam using MediaPipe (GPU-accelerated).
- **Perspective quads** — Three configurable regions anchored to fingertip landmarks:
  - Thumb + Index
  - Index + Middle
  - Middle + Ring
- **Visual filters** — 15 presets including Invert, Sepia, Noir, Prism, Neon, Matrix, X-Ray, and a fully customizable filter builder.
- **Procedural effects** — Canvas-driven effects for TV Static, Glitch, Thermal, and Scanlines that animate in real time.
- **Perspective text** — Label each quad with text that follows the quad's 3D perspective.
- **Auto-cycle** — Automatically rotate filter presets on a timer, in sync or staggered across quads. Optional wireframe overlay connects adjacent quads.
- **Persistent settings** — All controls are saved to `localStorage` and restored on reload.

## Requirements

- A modern browser with WebRTC camera access (Chrome, Edge, or Firefox recommended).
- A webcam.
- Internet connection on first load (MediaPipe WASM and model assets are fetched from CDN).

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`) and allow camera access when prompted.

### Other scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run build`   | Type-check and build for production |
| `npm run preview` | Serve the production build locally  |
| `npm run lint`    | Run ESLint               |

## Usage

1. Position your hand so all four tracked fingertips (thumb through ring) are visible.
2. Use the **controls panel** on the right to adjust markers, per-quad filters, borders, text, and auto-cycle behavior.
3. Toggle quads on/off, change filter presets and strength, or switch to **Custom** to fine-tune blur, brightness, contrast, and more.
4. Enable **Auto-cycle** to automatically rotate through filter presets every few seconds.

Settings are stored under the key `camfingertips-settings-v2` in `localStorage`.

## Project structure

```
src/
├── components/
│   ├── HandTracker.tsx      # Camera, MediaPipe loop, canvas rendering
│   ├── ControlsPanel.tsx    # Settings UI
│   └── PerspectiveQuadText.tsx
└── lib/
    ├── autoCycle.ts         # Filter rotation logic
    ├── filterPresets.ts     # CSS filter presets
    ├── proceduralEffects.ts # Canvas procedural effects
    ├── quadGeometry.ts      # Quad math and drawing
    ├── perspectiveText.ts   # Perspective-correct text rendering
    ├── handLandmarks.ts     # MediaPipe landmark indices
    ├── settingsStorage.ts   # Defaults and localStorage persistence
    └── types.ts
```

## Tech stack

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) — Hand Landmarker

## License

Private project.
