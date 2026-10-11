export type Socket = 'a' | 'b';
export type Bearing = 'left' | 'centre' | 'right';
export type Band = 'low' | 'mid' | 'high';
export type Scenario = Readonly<{ seed: number; socket: Socket; bearing: Bearing; band: Band }>;
export const caseCount = 18;

const sockets: readonly Socket[] = ['a', 'b'];
const bearings: readonly Bearing[] = ['left', 'centre', 'right'];
const bands: readonly Band[] = ['low', 'mid', 'high'];

export function scenarioFromSeed(seed: number): Scenario {
  const s = ((Math.trunc(seed) % caseCount) + caseCount) % caseCount;
  return {
    seed: s,
    socket: sockets[s % 2],
    bearing: bearings[Math.floor(s / 2) % 3],
    band: bands[Math.floor(s / 6) % 3],
  };
}

export type TimeFoldState = Readonly<{
  cell: 'home' | Socket;
  fuse: 'home' | 'protected' | 'bypass';
  gear: 'home' | 'drive';
  lens: 'home' | 'optic';
  alignment: Bearing;
  crystal: 'home' | 'receiver';
  frequency: Band;
}>;

export function initialStateFor(scenario: Scenario): TimeFoldState {
  return {
    cell: 'home', fuse: 'home', gear: 'home', lens: 'home',
    alignment: bearings.find(bearing => bearing !== scenario.bearing) ?? 'left',
    crystal: 'home',
    frequency: bands.find(band => band !== scenario.band) ?? 'low',
  };
}

export type World = Readonly<{ powered: boolean; hazard: boolean; aimed: boolean; signalRecovered: boolean }>;

export function deriveWorld(state: TimeFoldState, scenario: Scenario): World {
  const powered = state.cell === scenario.socket && state.fuse === 'protected';
  const hazard = state.cell === scenario.socket && state.fuse === 'bypass';
  const aimed = powered && state.gear === 'drive' && state.lens === 'optic' && state.alignment === scenario.bearing;
  const signalRecovered = aimed && state.crystal === 'receiver' && state.frequency === scenario.band;
  return { powered, hazard, aimed, signalRecovered };
}

export type Chapter = 1 | 2 | 3;
export type ClueId = 'wiring' | 'sky' | 'plaque';
export const clueChapters: Readonly<Record<ClueId, Chapter>> = { wiring: 1, sky: 2, plaque: 3 };
export type Stats = Readonly<{ moves: number; misfires: number; hazards: number; undos: number; evidenceFirst: number }>;
export type Game = Readonly<{
  scenario: Scenario;
  state: TimeFoldState;
  unlocked: Chapter;
  revision: number;
  history: readonly TimeFoldState[];
  evidence: readonly ClueId[];
  stats: Stats;
}>;
export type GameAction = {
  [Field in keyof TimeFoldState]: { kind: 'change'; field: Field; value: TimeFoldState[Field] }
}[keyof TimeFoldState] | { kind: 'undo' } | { kind: 'resetChapter'; chapter: Chapter } | { kind: 'inspect'; clue: ClueId };

export function newGame(seed: number = Math.floor(Math.random() * caseCount)): Game {
  const scenario = scenarioFromSeed(seed);
  return {
    scenario,
    state: initialStateFor(scenario),
    unlocked: 1,
    revision: 0,
    history: [],
    evidence: [],
    stats: { moves: 0, misfires: 0, hazards: 0, undos: 0, evidenceFirst: 0 },
  };
}

export const fieldChapters: Readonly<Record<keyof TimeFoldState, Chapter>> = {
  cell: 1, fuse: 1, gear: 2, lens: 2, alignment: 2, crystal: 3, frequency: 3,
};
const fields: (keyof TimeFoldState)[] = ['cell', 'fuse', 'gear', 'lens', 'alignment', 'crystal', 'frequency'];

function isMisfire(field: keyof TimeFoldState, value: TimeFoldState[keyof TimeFoldState], scenario: Scenario): boolean {
  if (field === 'cell') return value !== 'home' && value !== scenario.socket;
  if (field === 'fuse') return value === 'bypass';
  if (field === 'alignment') return value !== scenario.bearing;
  if (field === 'frequency') return value !== scenario.band;
  return false;
}

const clueFields = { cell: 'wiring', alignment: 'sky', frequency: 'plaque' } as const;
type ClueField = keyof typeof clueFields;

function isClueField(field: keyof TimeFoldState): field is ClueField {
  return field === 'cell' || field === 'alignment' || field === 'frequency';
}

function correctValue(field: ClueField, scenario: Scenario): Socket | Bearing | Band {
  return field === 'cell' ? scenario.socket : field === 'alignment' ? scenario.bearing : scenario.band;
}

export function reduceGame(game: Game, action: GameAction): Game {
  const revision = game.revision + 1;
  if (!Number.isSafeInteger(revision)) return game;
  if (action.kind === 'inspect') {
    if (game.evidence.includes(action.clue) || clueChapters[action.clue] > game.unlocked) return game;
    return { ...game, evidence: [...game.evidence, action.clue], revision };
  }
  if (action.kind === 'undo') {
    const state = game.history.at(-1);
    return state
      ? { ...game, state, history: game.history.slice(0, -1), revision, stats: { ...game.stats, undos: game.stats.undos + 1 } }
      : game;
  }
  if (action.kind === 'change' && fieldChapters[action.field] > game.unlocked) return game;
  if (action.kind === 'resetChapter' && action.chapter > game.unlocked) return game;
  const initial = initialStateFor(game.scenario);
  const state: TimeFoldState = action.kind === 'change'
    ? { ...game.state, [action.field]: action.value }
    : action.chapter === 1
      ? { ...game.state, cell: initial.cell, fuse: initial.fuse }
      : action.chapter === 2
        ? { ...game.state, gear: initial.gear, lens: initial.lens, alignment: initial.alignment }
        : { ...game.state, crystal: initial.crystal, frequency: initial.frequency };
  if (fields.every(field => state[field] === game.state[field])) return game;
  const world = deriveWorld(state, game.scenario);
  const before = deriveWorld(game.state, game.scenario);
  const stats: Stats = {
    moves: game.stats.moves + 1,
    misfires: game.stats.misfires + (action.kind === 'change' && isMisfire(action.field, action.value, game.scenario) ? 1 : 0),
    hazards: game.stats.hazards + (world.hazard && !before.hazard ? 1 : 0),
    undos: game.stats.undos,
    evidenceFirst: game.stats.evidenceFirst + (action.kind === 'change' && isClueField(action.field)
      && action.value === correctValue(action.field, game.scenario) && game.evidence.includes(clueFields[action.field]) ? 1 : 0),
  };
  const unlocked: Chapter = game.unlocked === 3 || world.aimed ? 3 : game.unlocked === 2 || world.powered ? 2 : 1;
  return { ...game, state, unlocked, revision, history: [...game.history, game.state].slice(-64), stats };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function choice<Value extends string>(value: unknown, choices: readonly Value[]): value is Value {
  return choices.some(item => item === value);
}

export function parseTimeFoldState(value: unknown): TimeFoldState | null {
  if (!isRecord(value)) return null;
  const { cell, fuse, gear, lens, alignment, crystal, frequency } = value;
  if (!choice(cell, ['home', 'a', 'b']) || !choice(fuse, ['home', 'protected', 'bypass'])
    || !choice(gear, ['home', 'drive']) || !choice(lens, ['home', 'optic'])
    || !choice(alignment, bearings) || !choice(crystal, ['home', 'receiver'])
    || !choice(frequency, bands)) return null;
  return { cell, fuse, gear, lens, alignment, crystal, frequency };
}

export function parseScenario(value: unknown): Scenario | null {
  if (!isRecord(value) || typeof value.seed !== 'number' || !Number.isFinite(value.seed)) return null;
  const scenario = scenarioFromSeed(value.seed);
  if (('socket' in value && value.socket !== scenario.socket)
    || ('bearing' in value && value.bearing !== scenario.bearing)
    || ('band' in value && value.band !== scenario.band)) return null;
  return scenario;
}
