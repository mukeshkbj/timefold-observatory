import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { getFact, primaryFact, type KeeperRequest } from '../../shared/keeper';
import { caseLabel, chapterComplete, chapterContent, clueText, INTRO_CARDS, newPuzzleSession, recoveredMessage, reducePuzzle, type PuzzleAction, type PuzzleField, type PuzzleSession } from '../../shared/puzzle';
import { caseCount, clueChapters, deriveWorld, newGame } from '../../shared/timefold';
import { loadProgress, saveProgress } from '../timefold/progress';
import { AMBIENT_DEFAULT, type AmbientLight, type TrackingHint } from './arMath';

const INTRO_KEY = 'timefold.intro.v1';
const VOICE_KEY = 'timefold.voice.v1';
const FX_KEY = 'timefold.fx.v1';

export { INTRO_CARDS };

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
  introOpen: boolean;
  voice: boolean;
  tracking: TrackingHint;
  ambient: AmbientLight;
  replaceRequest: number;
  gestureHint: boolean;
  cinematic: boolean;
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
  openIntro: () => void;
  closeIntro: () => void;
  toggleVoice: () => void;
  setTracking: (tracking: TrackingHint) => void;
  setAmbient: (ambient: AmbientLight) => void;
  requestReplace: () => void;
  dismissGestureHint: () => void;
  toggleCinematic: () => void;
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
  introOpen: false,
  voice: true,
  tracking: null,
  ambient: AMBIENT_DEFAULT,
  replaceRequest: 0,
  gestureHint: false,
  cinematic: Platform.OS === 'ios',
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

function stopSpeech() {
  try { void Promise.resolve(Speech.stop()).catch(() => undefined); } catch { /* speech unavailable */ }
}

function speak(text: string) {
  if (!snapshot.voice) return;
  try {
    void Promise.resolve(Speech.stop()).catch(() => undefined).then(() => {
      try { Speech.speak(text, { rate: 0.95, pitch: 0.9, language: 'en-GB' }); } catch { /* speech unavailable */ }
    });
  } catch { /* speech unavailable */ }
}

function init() {
  if (started) return;
  started = true;
  Promise.all([
    loadProgress(),
    AsyncStorage.getItem(INTRO_KEY).catch(() => '1'),
    AsyncStorage.getItem(VOICE_KEY).catch(() => null),
    AsyncStorage.getItem(FX_KEY).catch(() => null),
  ]).then(([saved, intro, voice, fx]) => {
    emit({
      ...(saved
        ? { session: newPuzzleSession(saved), message: 'Checkpoint restored.' }
        : { message: 'No saved game. Repairs stay in memory until you Save.' }),
      busy: false,
      introOpen: intro === null,
      voice: voice !== '0',
      ...(fx === null ? {} : { cinematic: fx === '1' }),
    });
  }).catch(() => emit({ busy: false, introOpen: true, message: 'Storage unavailable. Play works in memory.' }));
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
    if (next.chapter !== before.chapter) {
      emit({ session: next, highlights: [], keeper: chapterContent[next.chapter].story });
      speak(chapterContent[next.chapter].story);
    } else {
      emit({ session: next });
    }
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
    speak(clue.detail);
    return;
  }
  const beforeWorld = deriveWorld(before.game.state, before.game.scenario);
  const world = deriveWorld(next.game.state, next.game.scenario);
  const kind: SfxKind = world.hazard && !beforeWorld.hazard ? 'hazard'
    : world.signalRecovered && !beforeWorld.signalRecovered ? 'signal' : 'place';
  const completed = chapterComplete(next.game, before.chapter) && !chapterComplete(before.game, before.chapter);
  const keeper = kind === 'signal' ? recoveredMessage
    : next.chapter !== before.chapter ? chapterContent[next.chapter].story
    : 'The timeline shifted. Ask the keeper for a hint or an explanation.';
  emit({
    session: next,
    sfx: { id: ++sfxId, kind },
    ripple: { id: ++rippleId, hazard: world.hazard },
    highlights: next.trace?.highlights ?? [],
    keeper,
    message: completed
      ? `Chapter ${before.chapter} complete. Chapters learned: ${next.game.unlocked}.`
      : `Revision ${next.game.revision}. Chapters learned: ${next.game.unlocked}.`,
    debriefOpen: kind === 'signal' ? true : snapshot.debriefOpen,
  });
  if (kind === 'signal' || next.chapter !== before.chapter) speak(keeper);
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
  speak(fact.text);
}

function newCase() {
  const seed = snapshot.session.game.scenario.seed;
  const next = newGame((seed + 1 + Math.floor(Math.random() * (caseCount - 1))) % caseCount);
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
  setPlacement: placement => {
    if (placement === snapshot.placement) return;
    emit(placement === 'placed' ? { placement, gestureHint: true } : { placement, gestureHint: false });
  },
  setTracking: tracking => { if (tracking !== snapshot.tracking) emit({ tracking }); },
  setAmbient: ambient => emit({ ambient }),
  requestReplace: () => emit({ replaceRequest: snapshot.replaceRequest + 1, gestureHint: false }),
  dismissGestureHint: () => { if (snapshot.gestureHint) emit({ gestureHint: false }); },
  toggleCinematic: () => {
    const cinematic = !snapshot.cinematic;
    emit({ cinematic });
    void AsyncStorage.setItem(FX_KEY, cinematic ? '1' : '0').catch(() => undefined);
  },
  closeDebrief: () => emit({ debriefOpen: false }),
  clearSfx: id => { if (snapshot.sfx?.id === id) emit({ sfx: null }); },
  openIntro: () => emit({ introOpen: true }),
  closeIntro: () => {
    emit({ introOpen: false });
    void AsyncStorage.setItem(INTRO_KEY, '1').catch(() => undefined);
  },
  toggleVoice: () => {
    const voice = !snapshot.voice;
    emit({ voice });
    void AsyncStorage.setItem(VOICE_KEY, voice ? '1' : '0').catch(() => undefined);
    if (!voice) stopSpeech();
  },
};

export function useCinematic() {
  return useSyncExternalStore(subscribe, () => snapshot.cinematic);
}

export function useReplaceRequest() {
  return useSyncExternalStore(subscribe, () => snapshot.replaceRequest);
}

export function useTimeFold() {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  return { ...state, actions };
}
