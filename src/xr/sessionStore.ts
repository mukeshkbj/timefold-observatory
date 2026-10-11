import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { getFact, primaryFact, type KeeperRequest } from '../../shared/keeper';
import { caseLabel, chapterComplete, chapterContent, clueText, newPuzzleSession, reducePuzzle, type PuzzleAction, type PuzzleField, type PuzzleSession } from '../../shared/puzzle';
import { clueChapters, deriveWorld, newGame } from '../../shared/timefold';
import { loadProgress, saveProgress } from '../timefold/progress';

export type SfxKind = 'place' | 'hazard' | 'inspect' | 'signal' | 'ripple';
export type Placement = 'scanning' | 'surface' | 'placed';
export type TimeFoldSnapshot = Readonly<{
  session: PuzzleSession;
  busy: boolean;
  message: string;
  keeper: string;
  highlights: readonly PuzzleField[];
  hintLevel: KeeperRequest['hintLevel'];
  placement: Placement;
  sfx: { id: number; kind: SfxKind } | null;
  ripple: { id: number; hazard: boolean } | null;
  debriefOpen: boolean;
}>;
export type TimeFoldActions = {
  init: () => void;
  dispatch: (action: PuzzleAction) => void;
  save: () => Promise<void>;
  ask: (question: 'hint' | 'explain') => void;
  cycleHint: () => void;
  newCase: () => void;
  setPlacement: (placement: Placement) => void;
  closeDebrief: () => void;
  clearSfx: (id: number) => void;
};

let snapshot: TimeFoldSnapshot = {
  session: newPuzzleSession(),
  busy: true,
  message: 'Loading local game progress.',
  keeper: 'The keeper watches the workbench. Select an object in the past.',
  highlights: [],
  hintLevel: 1,
  placement: 'scanning',
  sfx: null,
  ripple: null,
  debriefOpen: false,
};
const listeners = new Set<() => void>();
let rippleId = 0;
let sfxId = 0;
let started = false;

function emit(patch: Partial<TimeFoldSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function init() {
  if (started) return;
  started = true;
  loadProgress().then(saved => {
    emit(saved
      ? { session: newPuzzleSession(saved), busy: false, message: 'Checkpoint restored.' }
      : { busy: false, message: 'No saved game. Repairs stay in memory until you Save.' });
  }).catch(() => emit({ busy: false, message: 'Storage unavailable. Play works in memory.' }));
}

function dispatch(action: PuzzleAction) {
  if (snapshot.busy) return;
  const before = snapshot.session;
  const next = reducePuzzle(before, action);
  if (next === before) {
    if (action.kind === 'inspect' && !before.game.evidence.includes(action.clue)
      && clueChapters[action.clue] > before.game.unlocked) {
      emit({ message: `Noted — this evidence matters in chapter ${clueChapters[action.clue]}.` });
    }
    return;
  }
  if (next.game === before.game) {
    emit(action.kind === 'chapter'
      ? { session: next, highlights: [], keeper: chapterContent[next.chapter].story }
      : { session: next });
    return;
  }
  if (action.kind === 'inspect') {
    const clue = clueText(next.game.scenario, action.clue);
    emit({
      session: next,
      sfx: { id: ++sfxId, kind: 'inspect' },
      keeper: clue.detail,
      message: `Evidence recorded: ${clue.title}.`,
    });
    return;
  }
  const beforeWorld = deriveWorld(before.game.state, before.game.scenario);
  const world = deriveWorld(next.game.state, next.game.scenario);
  const kind: SfxKind = world.hazard && !beforeWorld.hazard ? 'hazard'
    : world.signalRecovered && !beforeWorld.signalRecovered ? 'signal' : 'place';
  const completed = chapterComplete(next.game, next.chapter) && !chapterComplete(before.game, next.chapter);
  emit({
    session: next,
    sfx: { id: ++sfxId, kind },
    ripple: { id: ++rippleId, hazard: world.hazard },
    highlights: next.trace?.highlights ?? [],
    keeper: 'The timeline shifted. Ask the keeper for a hint or an explanation.',
    message: completed
      ? `Chapter ${next.chapter} complete. Chapters learned: ${next.game.unlocked}.`
      : `Revision ${next.game.revision}. Chapters learned: ${next.game.unlocked}.`,
    debriefOpen: kind === 'signal' ? true : snapshot.debriefOpen,
  });
}

async function save() {
  emit({ busy: true });
  try {
    await saveProgress(snapshot.session.game);
    emit({ busy: false, message: 'Checkpoint saved.' });
  } catch {
    emit({ busy: false, message: 'Save failed. The session is intact; retry Save.' });
  }
}

function ask(question: 'hint' | 'explain') {
  const game = snapshot.session.game;
  const request: KeeperRequest = {
    schemaVersion: 2, requestId: randomUUID(), seed: game.scenario.seed,
    state: game.state, revision: game.revision, question, hintLevel: snapshot.hintLevel, era: 'past',
  };
  const fact = getFact(primaryFact(request));
  emit({ keeper: fact.text, highlights: fact.highlights });
}

function newCase() {
  const seed = snapshot.session.game.scenario.seed;
  const next = newGame((seed + 1 + Math.floor(Math.random() * 17)) % 18);
  emit({
    session: newPuzzleSession(next),
    highlights: [],
    debriefOpen: false,
    keeper: 'The keeper watches the workbench. Select an object in the past.',
    message: `${caseLabel(next.scenario)} begins. Its answers are different — read the evidence again.`,
  });
}

export const actions: TimeFoldActions = {
  init,
  dispatch,
  save,
  ask,
  cycleHint: () => emit({ hintLevel: snapshot.hintLevel === 3 ? 1 : snapshot.hintLevel === 1 ? 2 : 3 }),
  newCase,
  setPlacement: placement => emit({ placement }),
  closeDebrief: () => emit({ debriefOpen: false }),
  clearSfx: id => { if (snapshot.sfx?.id === id) emit({ sfx: null }); },
};

export function useTimeFold() {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  return { ...state, actions };
}
