# Cardio Cat

Live group heart-rate monitoring in the browser for trainers and small fitness studios.

> 🐈 **Vibe-coding project.** Designed and built end-to-end with AI tooling — initial UI/UX sketched in [Claude Design](https://claude.ai/design), implementation iterated with [Claude Code CLI](https://claude.com/claude-code) `v2.1.140` (Opus 4.7).

## What it does

Cardio Cat turns a laptop and a big screen into a group cardio dashboard. Each participant wears a Bluetooth chest strap, the trainer pairs the straps once, and the app shows everyone's pulse together in real time — BPM, current heart-rate zone, an ECG-style trace, a beating-heart animation per person, plus the group average and cumulative calories.

When the workout ends, the session is saved automatically with avg / max BPM, time-in-zone breakdown, kcal estimate and the full curve, so you can review progress over time.

## How it works

- **Bluetooth.** The browser's Web Bluetooth API talks directly to standard `heart_rate` sensors (service `0x180D`) — Polar H10, Wahoo TICKR, Garmin HRM-Dual and similar. Previously paired straps auto-reconnect via `navigator.bluetooth.getDevices()` with a small retry/backoff loop; a sensor that stops sending for more than 10 seconds is marked stale.
- **Zones & calories.** Five zones (Z1–Z5) are computed from each participant's Max HR using one of three formulas (`220 − age`, Tanaka, Gulati). Calorie estimates use Keytel, MET, or a simple formula — whichever fits the available data (age, weight, sex).
- **Storage.** Everything — participants, paired device IDs, session samples, settings — lives in the browser's `localStorage`. There is no backend and no telemetry. Data can be exported/imported as a single JSON file.
- **UI.** Vue 3 + Pinia + Tailwind. Three locales (Ukrainian, English, Crimean Tatar), light/dark theme, customisable accent color.

Requires a browser with Web Bluetooth support — Chrome, Edge or Opera on desktop. Firefox and Safari can still view saved sessions but cannot pair sensors.

## Requirements

- Node.js **20.19+** or **22.12+**
- A Chromium-based desktop browser (Chrome / Edge / Opera) for pairing sensors
- One or more Bluetooth heart-rate straps that implement the standard `heart_rate` service

## Quick start

```bash
npm install
npm run dev          # dev server at http://localhost:5173/
```

In dev mode, opening the app with empty storage seeds demo participants and a few past sessions, so you can explore the UI without a real strap.

### Other scripts

```bash
npm run build        # production build
npm run preview      # preview the production build
npm run type-check   # vue-tsc
npm run lint         # eslint --fix
npm run format       # prettier --write src/
npm run test:unit    # vitest
npm run test:e2e     # playwright
```
