import { useEffect, useRef, useState } from 'react';
import { ViroNode, ViroSound } from '@reactvision/react-viro';
import { randomUUID } from 'expo-crypto';
import { getFact, primaryFact, type KeeperRequest } from '../../shared/keeper';
import { buildEraVisuals } from '../../shared/presentation';
import { chapterComplete, chapterContent, newPuzzleSession, recoveredMessage, reducePuzzle, type PuzzleAction, type PuzzleField, type PuzzleSession } from '../../shared/puzzle';
import { deriveWorld } from '../../shared/timefold';
import { loadProgress, saveProgress } from '../timefold/progress';
import ObservatoryVisuals from './ObservatoryVisuals';
import PuzzleControls, { PuzzleButton } from './PuzzleControls';
import SceneLabel from './SceneLabel';

export default function TimeFoldContent({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<PuzzleSession>(newPuzzleSession);
  const current = useRef(session);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('Loading local game progress.');
  const [keeper, setKeeper] = useState('The keeper watches the workbench. Select an object in the past.');
  const [highlights, setHighlights] = useState<readonly PuzzleField[]>([]);
  const [level, setLevel] = useState<KeeperRequest['hintLevel']>(1);
  const [sfx, setSfx] = useState<{ id: number; hazard: boolean } | null>(null);
  const sfxId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    loadProgress().then(saved => {
      if (!mounted.current) return;
      if (saved) { const restored = newPuzzleSession(saved); current.current = restored; setSession(restored); }
      setMessage(saved ? 'Checkpoint restored.' : 'No saved game. Repairs stay in memory until you Save.');
      setBusy(false);
    }).catch(() => { if (mounted.current) { setMessage('Storage unavailable. Play works in memory.'); setBusy(false); } });
    return () => { mounted.current = false; };
  }, []);
  function dispatch(action: PuzzleAction) {
    if (busy) return;
    const before = current.current;
    const next = reducePuzzle(before, action);
    if (next === before) return;
    current.current = next;
    setSession(next);
    if (next.game !== before.game) {
      const bypassed = next.game.state.cell === 'main' && next.game.state.fuse === 'bypass';
      setSfx({ id: ++sfxId.current, hazard: bypassed });
      setHighlights(next.trace?.highlights ?? []);
      setKeeper('The timeline shifted. Ask the keeper for a hint or an explanation.');
      const completed = chapterComplete(next.game, next.chapter) && !chapterComplete(before.game, next.chapter);
      setMessage(completed ? `Chapter ${next.chapter} complete. Chapters learned: ${next.game.unlocked}.` : `Revision ${next.game.revision}. Chapters learned: ${next.game.unlocked}.`);
    } else if (action.kind === 'chapter') {
      setHighlights([]);
      setKeeper(chapterContent[next.chapter].story);
    }
  }
  async function save() {
    setBusy(true);
    try { await saveProgress(current.current.game); if (mounted.current) setMessage('Checkpoint saved.'); }
    catch { if (mounted.current) setMessage('Save failed. The session is intact; retry Save.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  function ask(question: KeeperRequest['question']) {
    const game = current.current.game;
    const request = { schemaVersion: 1, requestId: randomUUID(), state: game.state, revision: game.revision, question, hintLevel: level, era: 'past' } satisfies KeeperRequest;
    const fact = getFact(primaryFact(request));
    setKeeper(fact.text);
    setHighlights(fact.highlights);
  }
  const trace = session.trace;
  const world = deriveWorld(session.game.state);
  return <ViroNode>
    <ObservatoryVisuals layers={buildEraVisuals(session.game.state)} interaction={{ selected: session.selected, highlights, onSelect: field => dispatch({ kind: 'select', field }), onPlace: index => dispatch({ kind: 'placeChoice', index }) }} />
    <SceneLabel text="TIMEFOLD / THE LAST OBSERVATORY" position={[0, 1.32, 0]} width={2.4} height={0.13} color="#eee9df" size={0.5} />
    <SceneLabel text={chapterContent[session.chapter].objective} position={[0, 1.16, 0]} width={2.4} height={0.17} color="#b6c1b8" size={0.3} />
    <ViroNode position={[0, -0.06, 0.15]} scale={[0.7, 0.7, 0.7]}>
    <PuzzleControls session={session} busy={busy} dispatch={dispatch} />
    <SceneLabel text={trace ? `PAST: ${trace.past}\nPRESENT: ${trace.present}\nFUTURE: ${trace.future}` : 'Past edits determine present mechanisms and future consequences. Select a past object to begin.'} position={[0, -1.43, 0.58]} width={2.4} height={0.3} color="#d7b47b" size={0.28} />
    <PuzzleButton label="Undo" position={[-0.87, -1.69, 0.58]} disabled={busy || !session.game.history.length || session.pendingReset !== null} onPress={() => dispatch({ kind: 'undo' })} />
    <PuzzleButton label="Reset chapter" position={[-0.29, -1.69, 0.58]} disabled={busy || session.pendingReset !== null} onPress={() => dispatch({ kind: 'requestReset' })} />
    <PuzzleButton label="Save" position={[0.29, -1.69, 0.58]} disabled={busy} onPress={() => void save()} />
    <PuzzleButton label="Return home" position={[0.87, -1.69, 0.58]} disabled={false} onPress={onExit} />
    <PuzzleButton label={`Hint tier ${level}`} position={[-0.58, -1.86, 0.58]} disabled={busy} onPress={() => setLevel(value => value === 3 ? 1 : value === 1 ? 2 : 3)} />
    <PuzzleButton label="Authored hint" position={[0, -1.86, 0.58]} disabled={busy} onPress={() => ask('hint')} />
    <PuzzleButton label="Explain chain" position={[0.58, -1.86, 0.58]} disabled={busy} onPress={() => ask('explain')} />
    <SceneLabel text={world.signalRecovered ? recoveredMessage : keeper} position={[0, -2.1, 0.58]} width={2.4} height={0.23} color="#eee9df" size={0.32} />
    <SceneLabel text={message} position={[0, -2.38, 0.58]} width={2.4} height={0.24} color="#b6c1b8" size={0.26} />
    </ViroNode>
    {sfx && <ViroSound key={sfx.id} source={sfx.hazard ? require('../../assets/audio/hazard.wav') : require('../../assets/audio/place-chime.wav')} volume={0.5} onFinish={() => setSfx(current => current?.id === sfx.id ? null : current)} onError={() => setSfx(current => current?.id === sfx.id ? null : current)} />}
  </ViroNode>;
}
