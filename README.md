# SIH26143 — Oil Spill Detection + AIS Vessel Tracking

Automated oil spill detection from SAR satellite imagery, correlated with AIS vessel tracking data to identify the likely source vessel.

## Team

| Role | Owner | Owns |
|---|---|---|
| SAR Data Engineer | Vaibhav | Downloading and cleaning the satellite image dataset |
| ML Model Training | Anant | Training the segmentation model that detects spills |
| AIS Data Engineer | Anany | Live vessel tracking data (AISstream.io) |
| Backend | Uday | FastAPI — connects model, AIS data, and correlation logic |
| Frontend | Dhruv | React + Mapbox dashboard |
| Integration & PPT | Vaibhavi | Wiring everything together, checklist/roadmap ownership, demo, slides — has visibility into all parts |

## System Overview

```
SAR images → U-Net model → detected spill (lat/lon)
                                    │
AIS vessel tracks ─────────────────┤
                                    ▼
                         Correlation engine
                                    │
                                    ▼
                    FastAPI backend → React/Mapbox dashboard
```

## Branch Workflow

- `main` is protected — no direct pushes.
- Each person works on their own feature branch (e.g. `sar-data`, `ml-model`, `ais-data`, `backend`, `frontend`, `integration`).
- Open a PR into `main` when a piece is working. Vaibhavi reviews for integration fit.

## Timeline

| Days | Phase |
|---|---|
| 1–3 | Foundation — dataset downloaded, AIS connection live, repo structured |
| 4–7 | Core build — model trains, API skeleton up, static UI |
| 8–10 | Integration — real data flowing end-to-end |
| 11–13 | Polish — correlation tuning, UI cleanup, PDF report |
| 14–15 | Demo prep — rehearsal, backup video, slides finalized |

Full role breakdown, deliverables, and risk list: see `PROJECT_PLAN.md`.

## Recent Updates & Optimizations (Frontend)

We recently completed a major overhaul of the **React + Mapbox dashboard** to improve the mobile user experience (UX) and eliminate console errors, reinforcing the high-tech, tactical HUD aesthetic:

*   **Mobile UX & Responsiveness:**
    *   **Core Layout Overhauls:** Implemented flexible, responsive wrappers across `App.jsx`, `Architecture.jsx`, and `Footer.jsx` to gracefully wrap columns and scale font sizes on narrow screens.
    *   **Top Bar & Navigation:** Rebuilt the top navigation bar for small screens. Implemented a sleek, animated Hamburger menu with a glassmorphism dropdown (`rgba(0,0,0,0.85)` + blur). Ensured dynamic resizing to prevent horizontal overflow on narrow viewports.
    *   **Native Touch Scroll:** Resolved a major issue where `MapLibre GL` was intercepting vertical touch swipes. Overrode the default canvas behavior (`touch-action: pan-y !important`) to restore smooth native vertical scrolling on mobile phones while preserving horizontal map rotation.
    *   **De-cluttered Mobile Views:** Hid complex, space-consuming SVG equation callouts on the Stack page (`Stack.jsx`) and non-essential side panels in the HUD (`SpillHudOverlay.jsx`) for mobile resolutions, allowing the 3D models and critical text to breathe.
*   **Performance & Stability Fixes:**
    *   **Vite HMR Fix:** Resolved Vite Fast Refresh warnings by isolating standard function exports from React component files (`SharedArchitectureMechanics.jsx`).
    *   **SVG Rendering Errors:** Fixed React console errors in `HeroSection.jsx` caused by invalid CSS `calc()` operations inside SVG path attributes. Migrated these calculations to standard CSS transforms (`<g style={{ transform: ... }}>`).

## Daily Standup

Same time every day. 2 minutes per person: what's done, what's blocked, what's next.
