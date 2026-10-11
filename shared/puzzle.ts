import { caseCount, deriveWorld, fieldChapters, newGame, reduceGame, type Chapter, type ClueId, type Game, type GameAction, type Scenario, type TimeFoldState } from './timefold.ts';

export type PuzzleField = keyof TimeFoldState;
export type ChangeAction = Extract<GameAction, { kind: 'change' }>;
export type PlacementChoice = Readonly<{ label: string; action: ChangeAction }>;
export type CausalTrace = Readonly<{ past: string; present: string; future: string; highlights: readonly PuzzleField[] }>;
export type PuzzleSession = Readonly<{ game: Game; chapter: Chapter; selected: PuzzleField | null; pendingReset: Chapter | null; lastClue: ClueId | null; trace: CausalTrace | null }>;
export type PuzzleAction = { kind: 'select'; field: PuzzleField } | { kind: 'placeChoice'; index: number }
  | { kind: 'chapter'; chapter: Chapter } | { kind: 'undo' } | { kind: 'requestReset' }
  | { kind: 'cancelReset' } | { kind: 'confirmReset'; chapter: Chapter } | { kind: 'inspect'; clue: ClueId };

export const objectNames: Readonly<Record<PuzzleField, string>> = { cell: 'Power cell', fuse: 'Protection fuse', gear: 'Drive gear', lens: 'Lens', alignment: 'Alignment', crystal: 'Receiver crystal', frequency: 'Frequency' };
export const chapterFields: Readonly<Record<Chapter, readonly PuzzleField[]>> = { 1: ['cell', 'fuse'], 2: ['gear', 'lens', 'alignment'], 3: ['crystal', 'frequency'] };
export const chapterContent: Readonly<Record<Chapter, { title: string; objective: string; story: string }>> = {
  1: { title: 'Restore power', objective: 'Find which socket was ever wired — the 2026 room shows what 1986 hides — then restore protected power.', story: 'The first keeper left a dark observatory and an unfinished promise. Begin at the workbench.' },
  2: { title: 'Restore the sky', objective: 'Read the star\'s bearing from the open 2086 sky, then drive, sight and aim the 1986 telescope.', story: 'Light has returned, but the instrument cannot yet read the sky. Repair what connects motion to sight.' },
  3: { title: 'Recover the signal', objective: 'Find the band etched into the 2086 ruin and tune the 1986 receiver to it.', story: 'The signal crossed generations. Give the future keeper a way to hear it.' },
};
export const recoveredMessage = 'To the keeper who finds this room: the sky was never silent. We were waiting for someone to listen.';
export const INTRO_CARDS: readonly { title: string; body: string }[] = [
  { title: 'Three eras, one table', body: '1986 is the only one you can touch.' },
  { title: 'The answers live downstream', body: 'Tap evidence in 2026 and 2086.' },
  { title: 'Repair the past', body: 'Watch the ripple carry it forward. Bridging the fuse under load has consequences.' },
];
const choices: Readonly<Record<PuzzleField, readonly PlacementChoice[]>> = {
  cell: [{ label: 'Bench', action: { kind: 'change', field: 'cell', value: 'home' } }, { label: 'Socket A', action: { kind: 'change', field: 'cell', value: 'a' } }, { label: 'Socket B', action: { kind: 'change', field: 'cell', value: 'b' } }],
  fuse: [{ label: 'Bench', action: { kind: 'change', field: 'fuse', value: 'home' } }, { label: 'Protection socket', action: { kind: 'change', field: 'fuse', value: 'protected' } }, { label: 'Bypass link', action: { kind: 'change', field: 'fuse', value: 'bypass' } }],
  gear: [{ label: 'Bench', action: { kind: 'change', field: 'gear', value: 'home' } }, { label: 'Drive socket', action: { kind: 'change', field: 'gear', value: 'drive' } }],
  lens: [{ label: 'Bench', action: { kind: 'change', field: 'lens', value: 'home' } }, { label: 'Optical mount', action: { kind: 'change', field: 'lens', value: 'optic' } }],
  alignment: [{ label: 'Left', action: { kind: 'change', field: 'alignment', value: 'left' } }, { label: 'Centre', action: { kind: 'change', field: 'alignment', value: 'centre' } }, { label: 'Right', action: { kind: 'change', field: 'alignment', value: 'right' } }],
  crystal: [{ label: 'Bench', action: { kind: 'change', field: 'crystal', value: 'home' } }, { label: 'Receiver mount', action: { kind: 'change', field: 'crystal', value: 'receiver' } }],
  frequency: [{ label: 'Low band', action: { kind: 'change', field: 'frequency', value: 'low' } }, { label: 'Mid band', action: { kind: 'change', field: 'frequency', value: 'mid' } }, { label: 'High band', action: { kind: 'change', field: 'frequency', value: 'high' } }],
};
export const placementChoices = (field: PuzzleField): readonly PlacementChoice[] => choices[field];
export function newPuzzleSession(game: Game = newGame()): PuzzleSession {
  return { game, chapter: 1, selected: null, pendingReset: null, lastClue: null, trace: null };
}
export function chapterComplete(game: Game, chapter: Chapter): boolean {
  const world = deriveWorld(game.state, game.scenario);
  return chapter === 1 ? world.powered : chapter === 2 ? world.aimed : world.signalRecovered;
}
export function caseLabel(scenario: Scenario): string {
  return `CASE ${String(scenario.seed + 1).padStart(2, '0')} / ${caseCount}`;
}
const bearingText: Readonly<Record<Scenario['bearing'], string>> = { left: 'to the left', centre: 'directly overhead the axis', right: 'to the right' };
const bandText: Readonly<Record<Scenario['band'], string>> = { low: 'the first band — LOW', mid: 'the second band — MID', high: 'the third band — HIGH' };
export function clueText(scenario: Scenario, clue: ClueId): { era: 'present' | 'future'; title: string; detail: string } {
  if (clue === 'wiring') {
    const live = scenario.socket === 'a' ? 'A' : 'B';
    const dead = scenario.socket === 'a' ? 'B' : 'A';
    return { era: 'present', title: 'Exposed wiring (2026)', detail: `The cable from the motor runs to Socket ${live}. Socket ${dead} was never connected.` };
  }
  if (clue === 'sky') {
    return { era: 'future', title: 'Open sky (2086)', detail: `Through the collapsed dome the signal star hangs ${bearingText[scenario.bearing]}.` };
  }
  return { era: 'future', title: 'Etched plaque (2086)', detail: `Scratched into the ruin: ${bandText[scenario.band]}.` };
}
function traceChange(before: Game, after: Game): CausalTrace {
  const fields: readonly PuzzleField[] = [...chapterFields[1], ...chapterFields[2], ...chapterFields[3]];
  const highlights = fields.filter(field => before.state[field] !== after.state[field]);
  const past = highlights.map(field => `${objectNames[field]}: ${placementChoices(field).find(choice => choice.action.value === after.state[field])?.label ?? after.state[field]}`).join('; ');
  const world = deriveWorld(after.state, after.scenario);
  return {
    past,
    present: world.hazard ? 'Unprotected power arcs across the bypass — the motor dies in a shower of sparks.'
      : world.aimed ? 'The telescope is aligned with the signal star.'
        : world.powered ? 'The motor is energized; the optical chain is incomplete.'
          : 'The motor is silent; its power chain is incomplete.',
    future: world.hazard ? 'The burnt circuit never reached the future; the beacon stays dark.'
      : world.signalRecovered ? 'The lost message is recovered.'
        : world.powered ? 'The beacon is illuminated; the lost message is not recovered.'
          : 'The beacon is dark; the lost message is not recovered.',
    highlights,
  };
}
export function reducePuzzle(session: PuzzleSession, action: PuzzleAction): PuzzleSession {
  if (action.kind === 'cancelReset') return session.pendingReset ? { ...session, pendingReset: null } : session;
  if (action.kind === 'requestReset') return { ...session, pendingReset: session.chapter };
  if (action.kind === 'chapter') {
    return action.chapter <= session.game.unlocked ? { ...session, chapter: action.chapter, selected: null, pendingReset: null } : session;
  }
  if (session.pendingReset && action.kind !== 'confirmReset') return session;
  if (action.kind === 'select') {
    return fieldChapters[action.field] <= session.game.unlocked
      ? { ...session, chapter: fieldChapters[action.field], selected: action.field } : session;
  }
  const choice = action.kind === 'placeChoice' && session.selected ? placementChoices(session.selected)[action.index] : null;
  if (action.kind === 'placeChoice' && !choice) return session;
  if (action.kind === 'confirmReset' && session.pendingReset !== action.chapter) return session;
  const gameAction: GameAction | null = choice ? choice.action
    : action.kind === 'undo' ? { kind: 'undo' }
      : action.kind === 'confirmReset' ? { kind: 'resetChapter', chapter: action.chapter }
        : action.kind === 'inspect' ? { kind: 'inspect', clue: action.clue } : null;
  if (!gameAction) return session;
  const game = reduceGame(session.game, gameAction);
  if (game === session.game) return action.kind === 'confirmReset' ? { ...session, pendingReset: null } : session;
  if (action.kind === 'inspect') return { ...session, game, lastClue: action.clue };
  const nextChapter: Chapter = session.chapter < 3 && chapterComplete(game, session.chapter)
    && session.chapter + 1 <= game.unlocked ? session.chapter + 1 as Chapter : session.chapter;
  return { ...session, chapter: nextChapter, game, pendingReset: null, lastClue: null, trace: traceChange(session.game, game) };
}
