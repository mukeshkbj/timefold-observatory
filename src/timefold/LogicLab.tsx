import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildDebrief } from '../../shared/debrief';
import { getFact, type KeeperReply, type KeeperRequest } from '../../shared/keeper';
import { createKeeperClient } from '../../shared/keeperClient';
import { createSaveQueue, decodeProgress } from '../../shared/progress';
import { caseLabel, chapterContent, chapterFields, clueText, objectNames, placementChoices } from '../../shared/puzzle';
import { clueChapters, deriveWorld, newGame, reduceGame, type Chapter, type ClueId, type Game, type GameAction } from '../../shared/timefold';
import LabButton from './LabButton';

const labKey = 'timefold.lab.progress.v2';
const checkpointQueue = createSaveQueue(value => AsyncStorage.setItem(labKey, value));
const chapters: { id: Chapter; title: string }[] = [{ id: 1, title: 'Restore power' }, { id: 2, title: 'Restore the sky' }, { id: 3, title: 'Recover the signal' }];
const clues: readonly ClueId[] = ['wiring', 'sky', 'plaque'];
const clueButtons: Readonly<Record<ClueId, string>> = { wiring: 'Inspect the 2026 room', sky: 'Inspect the open 2086 sky', plaque: 'Inspect the 2086 ruin' };
function nextCaseSeed(seed: number) { return (seed + 1 + Math.floor(Math.random() * 17)) % 18; }
type StorageStatus = { kind: 'loading' } | { kind: 'saving' } | { kind: 'ready'; message: string } | { kind: 'error'; message: string };
type KeeperStatus = { kind: 'idle' | 'loading' } | { kind: 'shown'; reply: KeeperReply } | { kind: 'error'; message: string };

export default function LogicLab() {
  const [game, setGame] = useState<Game>(newGame);
  const current = useRef(game);
  const owner = useRef(0);
  const mounted = useRef(true);
  const [chapter, setChapter] = useState<Chapter>(1);
  const [era, setEra] = useState<KeeperRequest['era']>('past');
  const [level, setLevel] = useState<KeeperRequest['hintLevel']>(1);
  const [storage, setStorage] = useState<StorageStatus>({ kind: 'loading' });
  const [keeper, setKeeper] = useState<KeeperStatus>({ kind: 'idle' });
  const [reset, setReset] = useState<'session' | 'chapter' | 'case' | null>(null);
  const [showState, setShowState] = useState(false);
  const [notice, setNotice] = useState('Read the derived eras for evidence, then repair the past.');
  const { width } = useWindowDimensions();
  const world = deriveWorld(game.state, game.scenario);
  const busy = storage.kind === 'loading' || storage.kind === 'saving';

  function clearKeeper() { owner.current++; setKeeper({ kind: 'idle' }); }
  function replaceGame(next: Game) { current.current = next; setGame(next); clearKeeper(); }
  function change(action: GameAction) {
    const next = reduceGame(current.current, action);
    if (next === current.current) return;
    replaceGame(next);
    setNotice(action.kind === 'inspect'
      ? `Evidence recorded: ${clueText(next.scenario, action.clue).title}.`
      : `Arrangement changed. Revision ${next.revision}; ${next.history.length} undo steps.`);
  }
  async function readCheckpoint() {
    setStorage({ kind: 'loading' });
    try {
      await checkpointQueue.whenIdle();
      const raw = await AsyncStorage.getItem(labKey);
      if (!mounted.current) return;
      const restored = decodeProgress(raw);
      if (raw && !restored) { setStorage({ kind: 'error', message: 'Saved lab checkpoint is invalid. The memory session is unchanged; nothing was deleted.' }); return; }
      if (restored) { replaceGame(restored); setChapter(restored.unlocked); }
      setStorage({ kind: 'ready', message: restored ? 'Lab checkpoint restored. Game progress uses a separate key.' : 'No lab checkpoint yet. The session is in memory until saved.' });
    } catch { if (mounted.current) setStorage({ kind: 'error', message: 'Local storage is unavailable. The lab still works in memory; retry loading when ready.' }); }
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    AsyncStorage.getItem(labKey).then(raw => {
      if (!active) return;
      const restored = decodeProgress(raw);
      if (raw && !restored) { setStorage({ kind: 'error', message: 'Saved lab checkpoint is invalid. A fresh memory session is available; nothing was deleted.' }); return; }
      if (restored) { current.current = restored; setGame(restored); setChapter(restored.unlocked); }
      setStorage({ kind: 'ready', message: restored ? 'Lab checkpoint restored. Game progress uses a separate key.' : 'No lab checkpoint yet. The session is in memory until saved.' });
    }).catch(() => { if (active) setStorage({ kind: 'error', message: 'Local storage is unavailable. Continue in memory or retry loading.' }); });
    return () => { active = false; mounted.current = false; };
  }, []);

  async function saveCheckpoint() {
    setStorage({ kind: 'saving' });
    try { await checkpointQueue.save(current.current); if (mounted.current) setStorage({ kind: 'ready', message: 'Lab checkpoint saved locally. No room transforms or credentials were stored.' }); }
    catch { if (mounted.current) setStorage({ kind: 'error', message: 'The lab checkpoint could not be saved. The current memory session is intact; try saving again.' }); }
  }
  async function askKeeper(question: KeeperRequest['question']) {
    const ticket = ++owner.current;
    setKeeper({ kind: 'loading' });
    const ask = createKeeperClient({ mode: 'authored', transport: null, timeoutMs: 10000, currentRevision: () => current.current.revision });
    try {
      const result = await ask({ schemaVersion: 2, requestId: randomUUID(), seed: current.current.scenario.seed, state: current.current.state, revision: current.current.revision, question, hintLevel: level, era });
      if (!mounted.current || ticket !== owner.current || result.kind === 'stale') return;
      setKeeper({ kind: 'shown', reply: result.reply });
    } catch { if (mounted.current && ticket === owner.current) setKeeper({ kind: 'error', message: 'The authored explanation could not be prepared. Try again; no model request was made.' }); }
  }
  function confirmReset() {
    if (reset === 'session') { replaceGame(newGame(current.current.scenario.seed)); setChapter(1); setNotice('Memory session reset to this case\'s beginning. The saved lab checkpoint is unchanged.'); }
    else if (reset === 'case') { replaceGame(newGame(nextCaseSeed(current.current.scenario.seed))); setChapter(1); setNotice('A new case begins. Its answers are different — read the evidence again.'); }
    else if (reset === 'chapter') { change({ kind: 'resetChapter', chapter }); setNotice('Selected chapter reset. Prior chapter arrangements and learned unlocks are retained.'); }
    setReset(null);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.brand}>TIMEFOLD / LOCAL LAB / {caseLabel(game.scenario)}</Text><View style={styles.row}><LabButton label="New case" disabled={busy} onPress={() => setReset('case')} /><LabButton label="Return home" onPress={() => router.replace('/')} /></View></View>
        <Text accessibilityRole="header" style={styles.title}>Evidence from the future.{ '\n' }Repairs in the past.</Text>
        <Text style={styles.description}>{chapterContent[chapter].objective} This is a 2D logic lab, not AR/VR rendering or live Gemini.</Text>
        {storage.kind === 'loading' && <Text accessibilityLiveRegion="polite" style={styles.notice}>Checking the isolated lab checkpoint…</Text>}
        <View style={[styles.timeline, width < 760 && styles.stack]}>
          <View style={styles.era}><Text style={styles.eraTitle}>Past / editable</Text><Text style={styles.eraValue}>1986</Text><Text style={styles.body}>Cell: {game.state.cell === 'home' ? 'bench' : `socket ${game.state.cell.toUpperCase()}`}{ '\n' }Fuse: {game.state.fuse}{ '\n' }Gear: {game.state.gear}{ '\n' }Lens: {game.state.lens}{ '\n' }Alignment: {game.state.alignment}{ '\n' }Crystal: {game.state.crystal}{ '\n' }Frequency: {game.state.frequency}</Text></View>
          <View style={styles.era}><Text style={styles.eraTitle}>Present / derived</Text><Text style={styles.eraValue}>2026</Text><Text style={styles.body}>Motor: {world.hazard ? 'burnt' : world.powered ? 'energized' : 'silent'}{ '\n' }Circuit: {world.hazard ? 'bypass arced' : game.state.fuse === 'protected' ? 'protected' : 'open'}{ '\n' }Instrument: {world.aimed ? 'aligned' : 'incomplete'}</Text></View>
          <View style={styles.era}><Text style={styles.eraTitle}>Future / derived</Text><Text style={styles.eraValue}>2086</Text><Text style={styles.body}>Beacon: {world.powered ? 'illuminated' : world.hazard ? 'lost to the burn' : 'dark'}{ '\n' }Signal: {world.signalRecovered ? 'recovered' : 'waiting'}</Text></View>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>
        <View style={styles.row}>{chapters.map(item => <LabButton key={item.id} label={`Chapter ${item.id}: ${item.title}`} selected={chapter === item.id} disabled={busy || item.id > game.unlocked} onPress={() => { clearKeeper(); setChapter(item.id); }} />)}</View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>Evidence</Text>
          <Text style={styles.description}>The answers live downstream. Inspect the derived eras before you touch the workbench.</Text>
          <View style={styles.row}>{clues.map(clue => <LabButton key={clue} label={game.evidence.includes(clue) ? `Review: ${clueText(game.scenario, clue).title}` : clueButtons[clue]} disabled={busy || clueChapters[clue] > game.unlocked} onPress={() => change({ kind: 'inspect', clue })} />)}</View>
          {game.evidence.length === 0 && <Text style={styles.body}>No evidence collected yet. Inspections unlock as chapters do.</Text>}
          {game.evidence.map(clue => { const text = clueText(game.scenario, clue); return (
            <View key={clue} style={styles.reply}><Text style={styles.provenance}>{text.era === 'present' ? 'EVIDENCE / 2026' : 'EVIDENCE / 2086'}</Text><Text style={styles.replyText}>{text.title}</Text><Text style={styles.body}>{text.detail}</Text></View>
          ); })}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>Past workbench</Text>
          <Text style={styles.description}>These controls commit logical placements. They do not test touch dragging, controller input or physical anchoring.</Text>
          {chapterFields[chapter].map(field => <View key={field} style={styles.control}><Text style={styles.controlLabel}>{objectNames[field]}</Text><View style={styles.row}>{placementChoices(field).map(option => <LabButton key={option.label} label={option.label} selected={game.state[field] === option.action.value} disabled={busy} onPress={() => change(option.action)} />)}</View></View>)}
          <View style={styles.row}><LabButton label="Undo last repair" disabled={busy || !game.history.length} onPress={() => change({ kind: 'undo' })} /><LabButton label="Reset selected chapter" disabled={busy} onPress={() => setReset('chapter')} /><LabButton label="Reset lab session" disabled={busy} onPress={() => setReset('session')} /></View>
          {reset && <View style={styles.confirm}><Text style={styles.body}>{reset === 'session' ? 'Reset this memory session to the start of this case? The saved lab checkpoint will remain unchanged.' : reset === 'case' ? 'Abandon this case and open a new one? The answers will differ; the saved lab checkpoint will remain unchanged.' : 'Reset only the selected chapter? Earlier chapter arrangements and learned unlocks remain; this reset can be undone.'}</Text><View style={styles.row}><LabButton label="Cancel" onPress={() => setReset(null)} /><LabButton label={reset === 'session' ? 'Confirm session reset' : reset === 'case' ? 'Confirm new case' : 'Confirm chapter reset'} primary disabled={busy} onPress={confirmReset} /></View></View>}
        </View>
        {world.signalRecovered && (() => { const debrief = buildDebrief(game); return (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>Case debrief / {debrief.caseLabel}</Text>
            <View style={styles.reply}><Text style={styles.provenance}>{debrief.rating.toUpperCase()}</Text><Text style={styles.replyText}>{debrief.lesson}</Text>
              <Text style={styles.body}>Moves {debrief.moves} · Misfires {debrief.misfires} · Hazards {debrief.hazards} · Undos {debrief.undos}{ '\n' }Evidence found {debrief.evidenceFound}/{debrief.evidenceTotal} · Evidence-first repairs {debrief.evidenceFirst}</Text>
              <Text selectable style={styles.state}>{debrief.chain.join('\n')}</Text>
            </View>
          </View>
        ); })()}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>The keeper</Text>
          <Text style={styles.description}>Authored mode only. No authentication, backend or model request is made by this lab.</Text>
          <View style={styles.row}>{([{ value: 1, label: 'Hint: observe' }, { value: 2, label: 'Hint: direction' }, { value: 3, label: 'Hint: exact step' }] satisfies { value: KeeperRequest['hintLevel']; label: string }[]).map(item => <LabButton key={item.value} label={item.label} selected={level === item.value} disabled={busy} onPress={() => { clearKeeper(); setLevel(item.value); }} />)}</View>
          <View style={styles.row}>{(['past', 'present', 'future'] satisfies KeeperRequest['era'][]).map(item => <LabButton key={item} label={`Lore era: ${item}`} selected={era === item} disabled={busy} onPress={() => { clearKeeper(); setEra(item); }} />)}</View>
          <View style={styles.row}><LabButton label="Ask for a hint" disabled={busy || keeper.kind === 'loading'} primary onPress={() => void askKeeper('hint')} /><LabButton label="Explain the chain" disabled={busy || keeper.kind === 'loading'} onPress={() => void askKeeper('explain')} /><LabButton label="Tell this era's story" disabled={busy || keeper.kind === 'loading'} onPress={() => void askKeeper('lore')} /></View>
          {keeper.kind === 'idle' && <Text style={styles.body}>Choose a question. The answer is computed from the current arrangement.</Text>}
          {keeper.kind === 'loading' && <Text accessibilityLiveRegion="polite" style={styles.body}>Preparing the authored explanation…</Text>}
          {keeper.kind === 'error' && <Text accessibilityLiveRegion="assertive" style={styles.error}>{keeper.message}</Text>}
          {keeper.kind === 'shown' && <View style={styles.reply}><Text style={styles.provenance}>AUTHORED / NOT LIVE GEMINI</Text><Text accessibilityLiveRegion="polite" style={styles.replyText}>{getFact(keeper.reply.factId).text}</Text><Text style={styles.description}>Highlights: {getFact(keeper.reply.factId).highlights.join(', ') || 'story only'}{ '\n' }Fact: {keeper.reply.factId} / revision {keeper.reply.revision}</Text></View>}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>Local checkpoint</Text>
          <Text style={styles.description}>The lab uses its own storage key. It never overwrites actual game progress. Saving is explicit.</Text>
          <Text accessibilityLiveRegion="polite" style={storage.kind === 'error' ? styles.error : styles.body}>{storage.kind === 'loading' ? 'Loading the lab checkpoint…' : storage.kind === 'saving' ? 'Saving the lab checkpoint…' : storage.message}</Text>
          <View style={styles.row}><LabButton label="Save lab checkpoint" disabled={busy} onPress={() => void saveCheckpoint()} /><LabButton label="Reload lab checkpoint" disabled={busy} onPress={() => void readCheckpoint()} /><LabButton label={showState ? 'Hide state inspector' : 'Show state inspector'} onPress={() => setShowState(value => !value)} /></View>
          {showState && <Text testID="lab-state" selectable style={styles.state}>{JSON.stringify({ ...game, derived: world, labStorageKey: labKey, keeperMode: 'authored', nativeInputVerified: false }, null, 2)}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141817' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 28, paddingBottom: 80, gap: 22 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { color: '#d7b47b', fontSize: 12, letterSpacing: 3 },
  title: { color: '#eee9df', fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 42, lineHeight: 49, marginTop: 18 },
  description: { color: '#aaa79e', fontSize: 14, lineHeight: 23 },
  body: { color: '#ddd8ce', fontSize: 16, lineHeight: 26 },
  timeline: { flexDirection: 'row', gap: 28, marginTop: 12 },
  stack: { flexDirection: 'column' },
  era: { flex: 1, borderTopWidth: 1, borderTopColor: '#596051', paddingTop: 18, gap: 12 },
  eraTitle: { color: '#d7b47b', fontSize: 14 },
  eraValue: { color: '#eee9df', fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', fontSize: 32 },
  notice: { color: '#d7b47b', fontSize: 14, lineHeight: 23 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { borderTopWidth: 1, borderTopColor: '#363c36', paddingTop: 24, gap: 18 },
  heading: { color: '#eee9df', fontSize: 24, fontWeight: '600' },
  control: { gap: 10 },
  controlLabel: { color: '#ddd8ce', fontSize: 16, fontWeight: '600' },
  confirm: { borderLeftWidth: 3, borderLeftColor: '#d7b47b', padding: 18, gap: 16 },
  reply: { borderLeftWidth: 3, borderLeftColor: '#d7b47b', padding: 20, gap: 14, backgroundColor: '#1e251f' },
  provenance: { color: '#d7b47b', fontSize: 12, letterSpacing: 1 },
  replyText: { color: '#eee9df', fontSize: 20, lineHeight: 31 },
  error: { color: '#efb8a1', fontSize: 14, lineHeight: 23 },
  state: { color: '#ddd8ce', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 19 },
});
