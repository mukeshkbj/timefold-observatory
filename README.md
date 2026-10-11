# TimeFold — The Last Observatory

**Change the past. Hold the consequences.**

TimeFold is a causal-chain puzzle for AR phones and Meta Quest, built from a single
Expo / React Native codebase with [ViroReact](https://github.com/ReactVision/viro).
One observatory exists in three eras — 1986, 2026 and 2086. Only the past is
editable: place the power cell, protection fuse, drive gear, lens, alignment,
receiver crystal and frequency on the 1986 workbench, and watch the 2026 mechanism
and the 2086 beacon recompute in front of you — in physical space, on your table.

## Why it exists

Systems fail in chains. TimeFold makes dependency chains *spatial*: every repair in
the past is a cause, and the other two eras are consequences you can walk around.
It is a small, readable model of causal reasoning — the same skill behind fault
isolation, incident response and systems thinking.

## How it works

- **One rule engine, three eras** — `shared/timefold.ts` holds the whole game: a
  typed state, a reducer with chapter gating and bounded undo history, and
  `deriveWorld()` which computes powered → aimed → signalRecovered. The present
  and future eras are pure projections of that state.
- **Puzzle session** — `shared/puzzle.ts` layers selection, destination choices,
  chapter navigation, reset confirmation and a *causal trace* (what changed in the
  past, what follows in the present, what it means for the future).
- **XR layer** — `src/xr/` renders three era dioramas with ViroReact primitives.
  Objects and destination markers are directly tappable; a floating console
  handles chapters, undo, explicit save and keeper hints. A placement chime and
  a hazard crackle make consequences audible. Phone AR anchors the scene to a
  real plane; on Quest the same scene runs rooted in `ViroARScene`, so Horizon OS
  passthrough + plane detection turn it into mixed reality. If a phone reports
  no AR response, the app offers the logic lab instead of a black screen.
- **2D logic lab** — `src/timefold/LogicLab.tsx` runs the identical domain code in
  a flat, hardware-free surface (also on web) for testing rules, checkpoints and
  keeper replies.
- **The keeper** — `shared/keeper.ts` is a canonical hint/lore fact table wrapped
  in a strict request/reply protocol. An optional Supabase Edge Function
  (`supabase/functions/keeper`) can narrate replies with Gemini — schema-locked,
  quota-reserved in Postgres before any generation, and able to return only a
  factId plus short narration, never new game rules. It ships disabled
  (`KEEPER_ENABLED=false`); the game works fully in authored mode.

## Stack

Expo SDK 57 · React Native 0.86 · Expo Router · @reactvision/react-viro 3.0 ·
Supabase Edge Functions (Deno) · PostgreSQL (RPC quota store) · Zod · node:test

## Try it

- **Sideload** — install `app-release.apk` (Android/Quest): `adb install app-release.apk`,
  approve the security prompt, launch **TimeFold**, tap *Enter the observatory*.
  Phones need ARCore; without it the app routes to the 2D logic lab.
- **Demo video** — see the pinned release / submission link.

## Run it

```bash
npm install
npx expo start --dev-client     # dev server
npx expo run:android            # build + install on Android / Quest
npx expo run:ios                # build + install on iOS
npm run web                     # 2D logic lab in a browser (/lab)
npm run verify                  # typecheck, lint, tests, backend checks
```

Quest builds need a numeric `META_APP_ID` in `.env` (see `.env.example`).

## Repo layout

```
shared/     domain logic, keeper protocol, save codec — zero platform imports
src/app/    Expo Router screens (home, play, lab, settings)
src/xr/     ViroReact scenes: observatory, controls, launcher
src/timefold/ 2D lab, AsyncStorage progress, native keeper client
supabase/   keeper edge function, quota migration, SQL tests
tests/      node:test suites for the whole domain layer
```

Built for **Ctrl+Space**, the Expo × ReactVision hackathon.
