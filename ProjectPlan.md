# Jal Prahari — Project Plan
## SIH26143 — Oil Spill Detection + AIS Vessel Attribution

**Start:** 25 Aug 2026 | **Deadline:** 8 Sept 2026 | **Duration:** 15 days

Checklists use `- [ ]` — update to `- [x]` as tasks get done, so this file doubles as a live tracker. Keep it updated daily at standup, don't let it go stale.

---

## Team

| Name | Role |
|---|---|
| Vaibhav | SAR Data Engineer — dataset sourcing and cleaning |
| Anant | ML Engineer — model training |
| Anany | AIS Data Engineer — vessel tracking data |
| Dhruv | Frontend — dashboard |
| Uday | Backend — API and correlation logic |
| Vaibhavi | Integration & PPT — roadmap ownership, glue, demo, slides |

---

## Global Roadmap

| Dates | Phase | Exit condition — what must be true |
|---|---|---|
| 25–27 Aug (Day 1–3) | Foundation | Dataset downloaded. AIS connection live. Repo structured, everyone pushed once. |
| 28–31 Aug (Day 4–7) | Core build | Model produces real output. API returns data (real or stubbed). UI shows a static map. |
| 1–3 Sept (Day 8–10) | Integration | Real model output flows through the API into the UI — no mock data left anywhere. |
| 4–6 Sept (Day 11–13) | Polish | Correlation logic finalized. UI cleaned up. PDF report works. |
| 7–8 Sept (Day 14–15) | Demo prep | Rehearsed run-through, backup video recorded, slides finalized. Submission ready. |

**Hard rule:** everyone pushes their branch before each standup. Vaibhavi can't track progress on work that's still sitting on someone's laptop.

---

## Vaibhav — SAR Data Engineer

**Owns:** getting and cleaning the satellite image dataset.

**Roadmap**
- 25–26 Aug: Download SOS dataset (Zenodo, no approval needed). Download DARTIS as backup.
- 27 Aug: Build the data-loading script, verify images and masks line up correctly.
- 28–29 Aug: Train/val/test split. Add augmentation (rotation, flip, brightness).
- 30–31 Aug: Hand off clean dataset to Anant. Write a short doc on folder structure.
- 1 Sept onward: On standby — support Anant if data issues come up during training.

**Checklist**
- [ ] SOS dataset downloaded (Zenodo: zenodo.org/record/15298010)
- [ ] DARTIS backup downloaded
- [ ] Krestenitis email reply checked — if it arrives, folded in as secondary validation set only
- [ ] Data-loading script written and tested
- [ ] Images/masks verified to be correctly paired (no misalignment)
- [ ] Train/val/test split done (~80/10/10)
- [ ] Augmentation pipeline added (rotation, flip, brightness)
- [ ] Dataset folder handed off to Anant with documentation
- [ ] Sanity-check plots shared with team (a few sample image+mask pairs)

---

## Anant — ML Engineer

**Owns:** training the model that detects oil spills.

**Roadmap**
- 25 Aug: Set up Kaggle notebook (free GPU). Install `segmentation-models-pytorch`.
- 27–28 Aug: Receive clean dataset from Vaibhav. Build U-Net training loop.
- 29–31 Aug: Train, evaluate, iterate. Track IoU and F1-score.
- 1 Sept: **Hard checkpoint — if accuracy is weak, flag it to the team today, not later.**
- 2–3 Sept: Export final model to ONNX/TorchScript. Hand off to Uday.
- 4 Sept onward: On standby — support Uday if the model behaves differently outside the training environment.

**Checklist**
- [ ] Kaggle/training environment set up
- [ ] `segmentation-models-pytorch` (or equivalent) installed
- [ ] U-Net (or DeepLab) architecture chosen and implemented
- [ ] Training loop with Dice/BCE loss written
- [ ] First training run completed
- [ ] IoU and F1-score tracked and recorded
- [ ] Model iterated on if accuracy is weak — **flagged to team by 1 Sept if still weak**
- [ ] Final model exported (ONNX or TorchScript)
- [ ] Standalone test script written (one image in → one mask out) and verified working
- [ ] Model + test script handed off to Uday

---

## Anany — AIS Data Engineer

**Owns:** live vessel tracking data.

**Roadmap**
- 25 Aug: Register on aisstream.io. Confirm WebSocket connection works — do this first, before anything else.
- 26–28 Aug: Build the client that stores incoming vessel data (position, speed, heading, ID, timestamp).
- 29–31 Aug: Build the query function (vessels near a point, within a time window). Add anomaly flags (speed drops, erratic course).
- 1 Sept: Hand off working query endpoint to Uday.
- 2 Sept onward: On standby — support Uday during backend integration.

**Checklist**
- [ ] Registered on aisstream.io, API key obtained
- [ ] WebSocket connection tested and confirmed live
- [ ] Demo region picked (well-trafficked — Gulf of Mexico or Persian Gulf, matches dataset regions)
- [ ] Database set up to store vessel positions
- [ ] Client built to continuously store incoming AIS data
- [ ] Query function built: vessels near a point, within a time window
- [ ] Anomaly flags added (speed drop, erratic course change)
- [ ] Query function tested and handed off to Uday
- [ ] Confirmed the demo region reliably has vessel traffic (checked at a few different times of day)

---

## Uday — Backend

**Owns:** the API that connects everything, and the correlation logic.

**Roadmap**
- 25 Aug: `pip install fastapi uvicorn`. Scaffold all four routes below with mock responses so Dhruv isn't blocked.
- 26–31 Aug: Build out real logic in each route as Vaibhav/Anant/Anany's pieces become available.
- 1–3 Sept: Replace all mock data with real model + AIS outputs. Finalize correlation scoring.
- 4–6 Sept: Polish endpoints, error handling, PDF report generation.
- 7–8 Sept: Support demo rehearsal — make sure the API is stable under repeated calls.

**Checklist**
- [ ] FastAPI project scaffolded
- [ ] `POST /detect` — stub built (returns mock spill polygon)
- [ ] `GET /vessels/near` — stub built (returns mock vessel list)
- [ ] `GET /correlate` — stub built (returns mock scored vessel)
- [ ] `GET /reports/{id}` — stub built
- [ ] `/detect` connected to Anant's real model
- [ ] `/vessels/near` connected to Anany's real query function
- [ ] Correlation scoring logic implemented: `(1/distance) × (1/time gap) × speed_anomaly_flag`
- [ ] `/correlate` returns real scored results
- [ ] `/reports/{id}` generates a real PDF-ready summary
- [ ] All mock data removed — confirmed end-to-end real data flow
- [ ] Basic error handling added (bad image, no vessels found, etc.)
- [ ] API load-tested for demo-day stability

---

## Dhruv — Frontend

**Owns:** the dashboard judges will actually see.

**Roadmap**
- 25 Aug: `npm create vite@latest`. Set up React + Mapbox GL JS.
- 26–28 Aug: Build map view and static UI shell, using Uday's mock API responses.
- 29–31 Aug: Build image upload flow, spill overlay, vessel track overlay.
- 1–3 Sept: Swap mock data for Uday's real API. Build the "suspect vessel" highlight card.
- 4–6 Sept: PDF export button. UI polish and cleanup.
- 7–8 Sept: Support demo rehearsal — make sure the UI doesn't break under live conditions.

**Checklist**
- [ ] React + Vite project set up
- [ ] Mapbox GL JS integrated, map renders and centers on demo region
- [ ] Image upload/select flow built
- [ ] Spill detection overlay rendering (from `/detect` response)
- [ ] Vessel track overlay rendering (from `/vessels/near` response)
- [ ] "Suspect vessel" highlight card built (from `/correlate` response), score shown in plain terms
- [ ] Switched from mock API data to Uday's real endpoints
- [ ] PDF report export button working
- [ ] UI cleaned up — no debug elements, consistent layout
- [ ] Tested with real end-to-end data at least twice before demo

---

## Vaibhavi — Integration & PPT

**Owns:** wiring everything together, tracking overall progress, demo, and slides. Has visibility into all five other pieces.

**Roadmap**
- 25 Aug: Create GitHub repo. Add all 5 as collaborators. Set branch rules (feature branches, PRs into `main`).
- 26 Aug – 6 Sept: Daily — pull everyone's latest work, confirm it still runs together via `docker-compose`. Update this file's checkboxes based on standup.
- 4–6 Sept: Work with Uday on final correlation logic tuning.
- 6–7 Sept: Record backup demo video. Build the 15-slide PPT.
- 7–8 Sept: Run at least two full rehearsals. Finalize submission.

**Checklist**
- [ ] GitHub repo created, all 5 teammates added
- [ ] Branch protection on `main` set up
- [ ] `docker-compose.yml` written — runs backend + frontend + database with one command
- [ ] Daily integration check performed (from Day 3 onward)
- [ ] This checklist file kept updated after each standup
- [ ] Correlation logic reviewed with Uday for final tuning
- [ ] Demo video recorded as backup (in case live Wi-Fi/demo fails)
- [ ] 15-slide PPT built (problem, approach, dataset, model, results, live demo shots, correlation explained, tech stack, challenges, next steps, team)
- [ ] Demo script written and timed (5 minutes)
- [ ] Full rehearsal #1 completed
- [ ] Full rehearsal #2 completed
- [ ] Final submission checklist confirmed complete

---

## Risk List — review every 3 days

| Risk | Backup plan |
|---|---|
| Model accuracy is weak | Lower the bar to "detects large, clear spills reliably" — don't chase perfection |
| Krestenitis dataset never arrives | Already have SOS as primary — proceed without it |
| No vessels in demo region at demo time | Vaibhavi's recorded backup video plays instead |
| Live demo Wi-Fi fails | Backup video + screenshots ready |
| Someone falls behind | Caught at daily standup by Day 4 at the latest — reassign work early, don't wait |

---

## Final Submission Checklist (by 8 Sept)

- [ ] All code merged into `main`, working via `docker-compose up`
- [ ] Model trained with real, recorded accuracy numbers
- [ ] End-to-end demo works with zero mock data
- [ ] PDF report generation confirmed working
- [ ] PPT finalized
- [ ] Demo video recorded
- [ ] Two full rehearsals completed
- [ ] Every team member can explain their own piece under questioning