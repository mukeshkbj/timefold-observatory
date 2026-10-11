# TimeFold — The Last Observatory

**Evidence from the future. Repairs in the past.**

TimeFold is a spatial fault-isolation game for AR phones and Meta Quest mixed
reality, built from one Expo / React Native codebase with
[ViroReact](https://github.com/ReactVision/viro). One observatory stands on your
table in three eras at once: 1986, 2026 and 2086. You can only touch the past.
The present and the future are consequences, and they are also where the
evidence lives.

Every game is one of 72 seeded cases. Which socket was actually wired, where the
signal star sits and which band the receiver needs all change from case to case,
and nothing in 1986 gives the answer away. To fix the past you have to read the
future:

| Chapter | Evidence (derived eras) | Repair (1986) |
|---|---|---|
| 1 · Restore power | The 2026 bench cover is cracked open, and the exposed cable shows which socket was ever wired | Seat the cell in that socket and protect the circuit with the fuse |
| 2 · Restore the sky | The 2086 dome has collapsed, and the signal star is visible through the open ribs | Drive, sight and aim the telescope at that bearing |
| 3 · Recover the signal | A plaque etched into the 2086 ruin records the band | Tune the receiver to that band |

Each repair sends a visible **time ripple** along the brass rail. 2026 updates
when the ripple reaches it, then 2086, so you watch cause become effect.
Bridging the protection fuse under load arcs sparks in 1986, scorches 2026 and
leaves 2086 dark.

## Why it matters

Systems fail in chains, and the people who fix them (on-call engineers, field
technicians, students learning circuits) succeed by reading effects before
touching causes. TimeFold teaches that habit physically. At the end of each case
a **debrief** scores the investigation, not just the outcome: moves, misfires,
hazards, undos, how much evidence was gathered, how many repairs were
evidence-led, and the full causal chain from 1986 cell to 2086 signal. Players
are rated *Root-cause investigator*, *Methodical engineer*, *Trial and error* or
*Learned the hard way*.

## How it's built

- **One rule engine:** `shared/timefold.ts`. Seeded scenarios, a typed state,
  and a reducer with chapter gating, bounded undo, evidence and investigation
  stats. `deriveWorld(state, scenario)` computes powered → hazard → aimed →
  signalRecovered. The present and future are pure projections of the past.
  The test suite proves, for every one of the 72 cases, that exactly one of the
  648 possible arrangements recovers the signal, and that the starting position
  never leaks the answer.
- **Session store:** `src/xr/sessionStore.ts`. A single external store
  (`useSyncExternalStore`) shared by the AR scene and the native HUD.
- **Phone AR:** plane detection anchors the triptych (about 1 m wide) to a real
  tabletop. A native React Native HUD over the camera carries the case,
  chapters, evidence, destination choices, keeper, causal trace and debrief,
  with haptics.
- **Quest mixed reality:** the same scene rooted in `ViroARScene`, so Horizon OS
  passthrough puts the observatory in your room. A self-contained in-world
  lectern console is laid out for the OpenXR local reference space.
- **Scene craft:** three era-specific dressings, in-world tappable clues, the
  time ripple with era-lagged updates, particle sparks, smoke, dust and signal
  motes, a warm key light with real-surface contact shadows, and sound cues for
  repair, hazard, discovery, ripple and signal recovery.
- **The keeper:** `shared/keeper.ts`. Tiered, scenario-aware hints (where to
  look → what the evidence means → exact step) in a strict, versioned
  request/reply protocol. An optional Supabase Edge Function can narrate replies
  with Gemini. It is schema-locked, quota-reserved in Postgres before
  generation, and can only return a canonical fact ID plus narration, never new
  rules. It ships disabled; the game is complete offline.
- **2D logic lab:** `src/timefold/LogicLab.tsx`. The identical engine on a flat
  surface (also on web), and the fallback when a phone has no AR support.

## Stack

Expo SDK 57 · React Native 0.86 · Expo Router · @reactvision/react-viro 3.0 ·
Reanimated · expo-haptics · Supabase Edge Functions (Deno) · PostgreSQL · Zod ·
node:test

## Try it

- **Sideload (Android phone with ARCore, or Meta Quest 3/3S):**
  `adb install timefold-release.apk`, launch **TimeFold**, then tap *Enter the
  observatory*. On a phone, scan a table and tap the highlighted surface. On
  Quest, the observatory appears in passthrough in front of you, with the
  console at hand height.
- **No AR device:** the app offers the 2D logic lab, which is also available on
  web at `/lab` (`npm run web`).

## Run it

```bash
npm install
npx expo run:android            # build + install on Android / Quest
npx expo run:ios                # build + install on iOS
npm run web                     # 2D logic lab in a browser (/lab)
npm run verify                  # typecheck, lint, tests, backend checks
```

Quest builds need a numeric `META_APP_ID` in `.env` (see `.env.example`).

## Repo layout

```
shared/       rule engine, scenarios, debrief, keeper protocol, save codec (no platform imports)
src/app/      Expo Router screens (home, play, lab, settings)
src/xr/       ViroReact scenes, session store, phone HUD, Quest console, diorama/
src/timefold/ 2D lab, AsyncStorage progress, native keeper client
supabase/     keeper edge function, quota migration, SQL tests
tests/        node:test suites for the domain layer
```

Built for **Ctrl+Space**, the Expo × ReactVision hackathon.
