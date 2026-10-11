import { clueChapters, deriveWorld, initialStateFor, isRecord, parseScenario, parseTimeFoldState, type Chapter, type ClueId, type Game, type Stats, type TimeFoldState } from './timefold.ts';

export const progressKey = 'timefold.progress.v2';
const clueIds: readonly ClueId[] = ['wiring', 'sky', 'plaque'];

export function encodeProgress(game: Game): string {
  return JSON.stringify({
    schemaVersion: 2,
    seed: game.scenario.seed,
    state: game.state,
    unlocked: game.unlocked,
    revision: game.revision,
    history: game.history,
    evidence: game.evidence,
    stats: game.stats,
  });
}

function parseStats(value: unknown): Stats | null {
  if (!isRecord(value)) return null;
  const { moves, misfires, hazards, undos, evidenceFirst } = value;
  const items = [moves, misfires, hazards, undos, evidenceFirst];
  if (!items.every(item => typeof item === 'number' && Number.isSafeInteger(item) && item >= 0)) return null;
  return { moves: moves as number, misfires: misfires as number, hazards: hazards as number, undos: undos as number, evidenceFirst: evidenceFirst as number };
}

export function decodeProgress(raw: string | null): Game | null {
  if (!raw || raw.length > 32768) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value) || value.schemaVersion !== 2 || (value.unlocked !== 1 && value.unlocked !== 2 && value.unlocked !== 3)
    || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !Array.isArray(value.history) || value.history.length > 64 || value.history.length > value.revision
    || typeof value.seed !== 'number' || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 17) return null;
  const unlocked = value.unlocked as Chapter;
  const scenario = parseScenario(value);
  if (!scenario) return null;
  if (!Array.isArray(value.evidence) || value.evidence.length > clueIds.length
    || new Set(value.evidence).size !== value.evidence.length
    || !value.evidence.every(clue => clueIds.includes(clue as ClueId) && clueChapters[clue as ClueId] <= unlocked)) return null;
  const stats = parseStats(value.stats);
  if (!stats) return null;
  const state = parseTimeFoldState(value.state);
  if (!state) return null;
  const history: TimeFoldState[] = [];
  const items: unknown[] = value.history;
  for (const item of items) {
    const snapshot = parseTimeFoldState(item);
    if (!snapshot) return null;
    history.push(snapshot);
  }
  const initial = initialStateFor(scenario);
  for (const snapshot of [state, ...history]) {
    const world = deriveWorld(snapshot, scenario);
    if (unlocked < 2 && (world.powered || snapshot.gear !== initial.gear || snapshot.lens !== initial.lens || snapshot.alignment !== initial.alignment)) return null;
    if (unlocked < 3 && (world.aimed || snapshot.crystal !== initial.crystal || snapshot.frequency !== initial.frequency)) return null;
  }
  const evidence = value.evidence as ClueId[];
  return { scenario, state, unlocked, revision: value.revision, history, evidence, stats };
}

export function createSaveQueue(write: (value: string) => Promise<void>) {
  let tail = Promise.resolve();
  return {
    save(game: Game) {
      const snapshot = encodeProgress(game);
      const pending = tail.then(() => write(snapshot));
      tail = pending.catch(() => {});
      return pending;
    },
    whenIdle: () => tail,
  };
}
