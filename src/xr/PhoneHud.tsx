import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildDebrief } from '../../shared/debrief';
import { caseLabel, chapterComplete, chapterContent, chapterFields, clueText, objectNames, placementChoices } from '../../shared/puzzle';
import { clueChapters, deriveWorld, type ClueId } from '../../shared/timefold';
import type { TrackingHint } from './arMath';
import { INTRO_CARDS, useTimeFold } from './sessionStore';

const C = {
  bg: '#141817',
  panel: '#141817E6',
  brass: '#d7b47b',
  ink: '#eee9df',
  muted: '#b6c1b8',
  signal: '#8be0c4',
  hazard: '#c96a52',
};

const CLUES: readonly ClueId[] = ['wiring', 'sky', 'plaque'];
const CLUE_NAME: Readonly<Record<ClueId, string>> = { wiring: 'Wiring', sky: 'Sky', plaque: 'Plaque' };
const CLUE_ERA: Readonly<Record<ClueId, string>> = { wiring: 'Find it in 2026', sky: 'Find it in 2086', plaque: 'Find it in 2086' };

const TRACKING_COACH: Readonly<Record<NonNullable<TrackingHint>, string>> = {
  motion: 'Moving too fast — slow down',
  features: 'Not enough detail — aim at a textured, well-lit surface',
  unavailable: 'Tracking lost — hold steady',
};

const haptic = (promise: Promise<unknown>) => { promise.catch(() => undefined); };

function Chip({ label, onPress, disabled, tone = 'dark', accessibilityLabel, accessibilityState }: {
  label: string; onPress?: () => void; disabled?: boolean; tone?: 'dark' | 'brass' | 'signal' | 'hazard' | 'dim';
  accessibilityLabel: string; accessibilityState?: { selected?: boolean };
}) {
  const bg = tone === 'brass' ? C.brass : tone === 'signal' ? C.signal : tone === 'hazard' ? C.hazard : tone === 'dim' ? '#1d2523' : '#22302c';
  const fg = tone === 'brass' || tone === 'signal' || tone === 'hazard' ? C.bg : tone === 'dim' ? C.muted : C.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={[styles.chip, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }]}>
      <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function HudButton({ label, onPress, disabled, tone = 'dark', accessibilityLabel, onLongPress }: {
  label: string; onPress?: () => void; onLongPress?: () => void; disabled?: boolean; tone?: 'dark' | 'brass' | 'signal' | 'hazard'; accessibilityLabel: string;
}) {
  const bg = tone === 'brass' ? C.brass : tone === 'signal' ? C.signal : tone === 'hazard' ? C.hazard : '#22302c';
  const fg = tone === 'dark' ? C.ink : C.bg;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }]}>
      <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export default function PhoneHud() {
  const snap = useTimeFold();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [armCase, setArmCase] = useState(false);
  const [openClue, setOpenClue] = useState<ClueId | null>(null);
  const [introPage, setIntroPage] = useState(0);
  const { session } = snap;
  const game = session.game;
  const world = deriveWorld(game.state, game.scenario);
  const resetPending = session.pendingReset !== null;
  const prevUnlocked = useRef(game.unlocked);

  useEffect(() => {
    if (!snap.sfx) return;
    if (snap.sfx.kind === 'hazard') haptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    else if (snap.sfx.kind === 'signal') haptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    else if (snap.sfx.kind === 'inspect') haptic(Haptics.selectionAsync());
    else haptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }, [snap.sfx]);

  useEffect(() => {
    if (game.unlocked > prevUnlocked.current) haptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    prevUnlocked.current = game.unlocked;
  }, [game.unlocked]);

  useEffect(() => {
    if (!snap.gestureHint) return;
    const timer = setTimeout(snap.actions.dismissGestureHint, 6000);
    return () => clearTimeout(timer);
  }, [snap.gestureHint, snap.actions]);

  const clueCard = openClue && game.evidence.includes(openClue) ? clueText(game.scenario, openClue) : null;
  const coach = snap.tracking ? TRACKING_COACH[snap.tracking]
    : snap.placement === 'scanning' ? 'Move your phone slowly across a table'
    : snap.placement === 'surface' ? 'Tap the highlighted surface to place the observatory'
    : snap.gestureHint && !snap.introOpen ? 'Pinch to resize · Twist to rotate'
    : null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View entering={FadeIn} style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          <Text style={styles.caseLabel}>{caseLabel(game.scenario)}</Text>
          <View style={styles.pills}>
            {([1, 2, 3] as const).map(chapter => {
              const complete = chapterComplete(game, chapter);
              const locked = chapter > game.unlocked;
              const current = chapter === session.chapter;
              return (
                <Pressable key={chapter} accessibilityRole="button"
                  accessibilityLabel={locked ? `Chapter ${chapter}, locked` : `Chapter ${chapter}${complete ? ', complete' : ''}`}
                  disabled={locked} onPress={() => snap.actions.dispatch({ kind: 'chapter', chapter })}
                  style={[styles.pill, current && styles.pillCurrent, locked && { opacity: 0.4 }]}>
                  <Text style={[styles.pillText, current && { color: C.bg }]}>
                    {complete ? `✓ Ch ${chapter}` : `Ch ${chapter}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={() => { setMenuOpen(true); setArmCase(false); }} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>≡</Text>
          </Pressable>
        </View>
        <Text style={styles.objective} numberOfLines={2}>{chapterContent[session.chapter].objective}</Text>
        {coach && (
          <Animated.View key={coach} entering={FadeIn} exiting={FadeOut} style={styles.coach}>
            <Text style={styles.coachText}>{coach}</Text>
          </Animated.View>
        )}
      </Animated.View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
        {resetPending && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.confirmBar}>
            <Text style={styles.confirmText}>Reset chapter {session.pendingReset}? Its progress is lost.</Text>
            <View style={styles.row}>
              <HudButton label="Confirm reset" tone="hazard" accessibilityLabel="Confirm chapter reset"
                onPress={() => snap.actions.dispatch({ kind: 'confirmReset', chapter: session.pendingReset! })} />
              <HudButton label="Keep playing" tone="brass" accessibilityLabel="Cancel chapter reset"
                onPress={() => snap.actions.dispatch({ kind: 'cancelReset' })} />
            </View>
          </Animated.View>
        )}
        {clueCard && openClue && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.clueCard}>
            <Text style={styles.clueTitle}>{clueCard.title}</Text>
            <Text style={styles.clueDetail}>{clueCard.detail}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close evidence" onPress={() => setOpenClue(null)} style={styles.clueClose}>
              <Text style={[styles.chipText, { color: C.signal }]}>Close</Text>
            </Pressable>
          </Animated.View>
        )}
        <View style={styles.eraStrip}>
          {[
            { year: '1986', word: 'repair', color: C.brass },
            { year: '2026', word: world.hazard ? 'burnt' : world.aimed ? 'aligned' : world.powered ? 'energised' : 'silent', color: world.hazard ? C.hazard : world.powered ? C.signal : C.muted },
            { year: '2086', word: world.signalRecovered ? 'signal' : world.hazard ? 'dark' : world.powered ? 'lit' : 'waiting', color: world.signalRecovered ? C.signal : world.hazard ? C.hazard : C.muted },
          ].map(era => (
            <View key={era.year} style={styles.eraCell}>
              <Text style={[styles.eraYear, { color: era.color }]}>{era.year}</Text>
              <Text style={[styles.eraWord, { color: era.color }]}>{era.word}</Text>
            </View>
          ))}
        </View>
        {session.trace && (
          <View style={styles.trace}>
            <Text style={[styles.traceRow, { color: C.brass }]} numberOfLines={1}>PAST · {session.trace.past}</Text>
            <Text style={[styles.traceRow, { color: world.hazard ? C.hazard : C.muted }]} numberOfLines={1}>PRESENT · {session.trace.present}</Text>
            <Text style={[styles.traceRow, { color: world.signalRecovered ? C.signal : C.ink }]} numberOfLines={1}>FUTURE · {session.trace.future}</Text>
          </View>
        )}
        <Text style={styles.keeper} numberOfLines={2}>{snap.keeper}</Text>
        <Text style={styles.message} numberOfLines={1}>{snap.message}</Text>
        <View style={styles.evidenceRow}>
          {CLUES.map(clue => {
            const locked = clueChapters[clue] > game.unlocked;
            const found = game.evidence.includes(clue);
            return (
              <Chip key={clue}
                label={locked ? `🔒 ${CLUE_NAME[clue]}` : found ? `✓ ${CLUE_NAME[clue]}` : CLUE_ERA[clue]}
                tone={found ? 'signal' : locked ? 'dim' : 'brass'}
                accessibilityLabel={found ? `Evidence ${CLUE_NAME[clue]}, collected` : locked ? `Evidence ${CLUE_NAME[clue]}, locked until chapter ${clueChapters[clue]}` : `Inspect ${CLUE_NAME[clue]}`}
                onPress={() => {
                  if (found) setOpenClue(current => current === clue ? null : clue);
                  else snap.actions.dispatch({ kind: 'inspect', clue });
                }} />
            );
          })}
        </View>
        {session.selected ? (
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{objectNames[session.selected]}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel selection" style={styles.cancel}
                onPress={() => snap.actions.dispatch({ kind: 'select', field: session.selected! })}>
                <Text style={[styles.chipText, { color: C.muted }]}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              {placementChoices(session.selected).map((choice, i) => {
                const current = game.state[session.selected!] === choice.action.value;
                return (
                  <Chip key={choice.label} label={choice.label}
                    tone={current ? 'brass' : 'dark'}
                    disabled={snap.busy}
                    accessibilityLabel={`Move ${objectNames[session.selected!]} to ${choice.label}`}
                    accessibilityState={{ selected: current }}
                    onPress={() => snap.actions.dispatch({ kind: 'placeChoice', index: i })} />
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.sheet}>
            <Text style={styles.sheetHint}>1986 workbench — chapter {session.chapter}</Text>
            <View style={styles.row}>
              {chapterFields[session.chapter].map(field => (
                <Chip key={field} label={objectNames[field]}
                  tone={snap.highlights.includes(field) ? 'brass' : 'dark'}
                  disabled={snap.busy || resetPending}
                  accessibilityLabel={`Select ${objectNames[field]}`}
                  onPress={() => { haptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); snap.actions.dispatch({ kind: 'select', field }); }} />
              ))}
            </View>
          </View>
        )}
        <View style={styles.actionRow}>
          <HudButton label="Undo" accessibilityLabel="Undo last repair" disabled={snap.busy || !game.history.length || resetPending}
            onPress={() => snap.actions.dispatch({ kind: 'undo' })} />
          <HudButton label={`Hint ${'●'.repeat(snap.hintLevel)}${'○'.repeat(3 - snap.hintLevel)}`}
            accessibilityLabel={`Keeper hint, tier ${snap.hintLevel}`} disabled={snap.busy || resetPending}
            onPress={() => snap.actions.ask('hint')} onLongPress={snap.actions.cycleHint} />
          <HudButton label="Explain" accessibilityLabel="Explain the causal chain" disabled={snap.busy || resetPending}
            onPress={() => snap.actions.ask('explain')} />
          <HudButton label="Tier" accessibilityLabel="Cycle hint tier" disabled={snap.busy} onPress={snap.actions.cycleHint} />
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
        <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[styles.menuSheet, { paddingBottom: insets.bottom + 16 }]}>
          <HudButton label="How to play" accessibilityLabel="Show the intro cards" tone="dark"
            onPress={() => { setMenuOpen(false); setIntroPage(0); snap.actions.openIntro(); }} />
          <HudButton label={`Keeper voice: ${snap.voice ? 'on' : 'off'}`}
            accessibilityLabel={`Keeper voice, currently ${snap.voice ? 'on' : 'off'}. Toggle`}
            tone="dark"
            onPress={snap.actions.toggleVoice} />
          <HudButton label="Move observatory" accessibilityLabel="Pick a new surface for the observatory" tone="dark"
            disabled={snap.placement !== 'placed'}
            onPress={() => { setMenuOpen(false); snap.actions.requestReplace(); }} />
          <HudButton label="Save" accessibilityLabel="Save checkpoint" tone="brass"
            onPress={() => { setMenuOpen(false); void snap.actions.save(); }} />
          <HudButton label="Reset chapter" accessibilityLabel="Reset current chapter" tone="dark" disabled={snap.busy}
            onPress={() => { setMenuOpen(false); snap.actions.dispatch({ kind: 'requestReset' }); }} />
          <HudButton label={armCase ? 'Confirm — start a different case' : 'New case'}
            accessibilityLabel={armCase ? 'Confirm new case' : 'Start a new case'} tone={armCase ? 'hazard' : 'dark'}
            disabled={snap.busy}
            onPress={() => { if (armCase) { setArmCase(false); setMenuOpen(false); snap.actions.newCase(); } else setArmCase(true); }} />
          <HudButton label="Return home" accessibilityLabel="Return home" tone="dark"
            onPress={() => { setMenuOpen(false); router.replace('/'); }} />
        </Animated.View>
      </Modal>

      <Modal visible={snap.debriefOpen} transparent animationType="fade" onRequestClose={snap.actions.closeDebrief}>
        <View style={styles.debriefBackdrop}>
          <ScrollView contentContainerStyle={styles.debriefScroll}>
            <View style={styles.debriefCard}>
              {(() => {
                const debrief = buildDebrief(game);
                return (
                  <>
                    <Text style={styles.debriefCase}>{debrief.caseLabel} — debrief</Text>
                    <Text style={styles.debriefRating}>{debrief.rating}</Text>
                    <Text style={styles.debriefLesson}>{debrief.lesson}</Text>
                    <View style={styles.statsGrid}>
                      {[
                        ['Moves', debrief.moves], ['Misfires', debrief.misfires], ['Hazards', debrief.hazards],
                        ['Undos', debrief.undos], ['Evidence', `${debrief.evidenceFound}/${debrief.evidenceTotal}`], ['Evidence-led', debrief.evidenceFirst],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.stat}>
                          <Text style={styles.statValue}>{value}</Text>
                          <Text style={styles.statLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.chainTitle}>Causal chain</Text>
                    {debrief.chain.map((link, i) => (
                      <Text key={i} style={[styles.chainRow, link.startsWith('✕') && { color: C.hazard }]}>{link}</Text>
                    ))}
                  </>
                );
              })()}
              <View style={styles.row}>
                <HudButton label="New case" tone="signal" accessibilityLabel="Start a new case"
                  onPress={snap.actions.newCase} />
                <HudButton label="Keep exploring" accessibilityLabel="Close debrief" tone="dark"
                  onPress={snap.actions.closeDebrief} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {snap.introOpen && (
        <Animated.View entering={FadeIn} style={[styles.introOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.introCard}>
            <Text style={styles.introStep}>{introPage + 1} / {INTRO_CARDS.length}</Text>
            <Text style={styles.introTitle}>{INTRO_CARDS[introPage].title}</Text>
            <Text style={styles.introBody}>{INTRO_CARDS[introPage].body}</Text>
            <View style={styles.introDots} accessibilityLabel={`Intro card ${introPage + 1} of ${INTRO_CARDS.length}`}>
              {INTRO_CARDS.map((card, i) => (
                <View key={card.title} style={[styles.introDot, i === introPage && styles.introDotOn]} />
              ))}
            </View>
            <HudButton label={introPage < INTRO_CARDS.length - 1 ? 'Next' : 'Start'} tone="brass"
              accessibilityLabel={introPage < INTRO_CARDS.length - 1 ? 'Next intro card' : 'Start playing'}
              onPress={() => {
                haptic(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                if (introPage < INTRO_CARDS.length - 1) setIntroPage(introPage + 1);
                else { setIntroPage(0); snap.actions.closeIntro(); }
              }} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 52, backgroundColor: C.panel },
  caseLabel: { color: C.brass, fontWeight: '700', fontSize: 13, letterSpacing: 1.2 },
  pills: { flexDirection: 'row', flex: 1, justifyContent: 'center', gap: 6 },
  pill: { minWidth: 64, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#22302c' },
  pillCurrent: { backgroundColor: C.brass },
  pillText: { color: C.ink, fontSize: 13, fontWeight: '600' },
  menuButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  menuButtonText: { color: C.ink, fontSize: 24 },
  objective: { color: C.muted, fontSize: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.panel },
  coach: { marginTop: 8, alignSelf: 'center', backgroundColor: C.panel, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.brass },
  coachText: { color: C.signal, fontSize: 13, fontWeight: '600' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  eraStrip: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 8 },
  eraCell: { flex: 1, backgroundColor: C.panel, borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  eraYear: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  eraWord: { fontSize: 10, marginTop: 1 },
  trace: { marginHorizontal: 12, marginTop: 8, backgroundColor: C.panel, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, gap: 2 },
  traceRow: { fontSize: 11 },
  keeper: { color: C.signal, fontStyle: 'italic', fontSize: 12, marginHorizontal: 16, marginTop: 8 },
  message: { color: C.muted, fontSize: 11, marginHorizontal: 16, marginTop: 2 },
  evidenceRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 8 },
  chip: { flex: 1, minHeight: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  sheet: { marginHorizontal: 12, marginTop: 8, backgroundColor: C.panel, borderRadius: 14, padding: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { color: C.signal, fontSize: 15, fontWeight: '700' },
  sheetHint: { color: C.muted, fontSize: 11, marginBottom: 6 },
  cancel: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 8 },
  button: { flex: 1, minHeight: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  confirmBar: { marginHorizontal: 12, marginBottom: 8, backgroundColor: C.panel, borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: C.hazard },
  confirmText: { color: C.hazard, fontSize: 13, fontWeight: '600' },
  clueCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: C.panel, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.signal },
  clueTitle: { color: C.signal, fontSize: 14, fontWeight: '700' },
  clueDetail: { color: C.ink, fontSize: 13, marginTop: 4 },
  clueClose: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000088' },
  menuSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.panel, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 10 },
  debriefBackdrop: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'center' },
  introOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0a0f0eE6', justifyContent: 'center', padding: 24 },
  introCard: { backgroundColor: C.panel, borderRadius: 18, padding: 24, gap: 14, borderWidth: 1, borderColor: C.brass },
  introStep: { color: C.muted, fontSize: 12, letterSpacing: 1.5 },
  introTitle: { color: C.signal, fontSize: 24, fontWeight: '700' },
  introBody: { color: C.ink, fontSize: 16, lineHeight: 24 },
  introDots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  introDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3a4744' },
  introDotOn: { backgroundColor: C.brass },
  debriefScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  debriefCard: { backgroundColor: C.panel, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.brass, gap: 10 },
  debriefCase: { color: C.brass, fontSize: 12, letterSpacing: 1.6, fontWeight: '700' },
  debriefRating: { color: C.signal, fontSize: 26, fontWeight: '800' },
  debriefLesson: { color: C.ink, fontSize: 14, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '30%', backgroundColor: '#1d2523', borderRadius: 10, padding: 8, alignItems: 'center' },
  statValue: { color: C.ink, fontSize: 18, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 10, marginTop: 2 },
  chainTitle: { color: C.brass, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  chainRow: { color: C.muted, fontSize: 12 },
});
