import { useState } from 'react';
import { ViroBox, ViroNode, ViroText } from '@reactvision/react-viro';
import { buildDebrief } from '../../shared/debrief';
import { caseLabel, chapterComplete, chapterContent, chapterFields, objectNames, placementChoices, type PuzzleField } from '../../shared/puzzle';
import { clueChapters, type ClueId } from '../../shared/timefold';
import SceneLabel from './SceneLabel';
import './diorama/materials';
import type { TimeFoldActions, TimeFoldSnapshot } from './sessionStore';
import type { Point } from './diorama/types';

const CLUE_NAME: Readonly<Record<ClueId, string>> = { wiring: 'Wiring', sky: 'Sky', plaque: 'Plaque' };
const CLUE_ERA: Readonly<Record<ClueId, string>> = { wiring: 'Find it in 2026', sky: 'Find it in 2086', plaque: 'Find it in 2086' };

function ConsoleButton({ label, position, width = 0.2, disabled = false, tint = 'tfDark', labelColor = '#eee9df', onPress }: {
  label: string; position: Point; width?: number; disabled?: boolean; tint?: string; labelColor?: string; onPress?: () => void;
}) {
  const press = disabled ? undefined : onPress;
  return (
    <ViroNode position={position}>
      <ViroBox width={width} height={0.058} length={0.03} materials={tint} opacity={disabled ? 0.35 : 0.95} onClick={press} />
      <SceneLabel text={label} position={[0, -0.012, 0.019]} width={width} height={0.055} size={0.24} color={labelColor} onClick={press} />
    </ViroNode>
  );
}

function DebriefPanel({ snap, actions }: { snap: TimeFoldSnapshot; actions: TimeFoldActions }) {
  const debrief = buildDebrief(snap.session.game);
  return (
    <ViroNode>
      <SceneLabel text={`${debrief.caseLabel} — debrief`} position={[0, 0.225, 0.02]} width={0.9} height={0.07} size={0.24} color="#d7b47b" />
      <SceneLabel text={debrief.rating} position={[0, 0.16, 0.02]} width={0.9} height={0.09} size={0.4} color="#8be0c4" />
      <SceneLabel text={debrief.lesson} position={[0, 0.095, 0.02]} width={0.9} height={0.06} size={0.2} color="#eee9df" />
      <SceneLabel
        text={`moves ${debrief.moves} · misfires ${debrief.misfires} · hazards ${debrief.hazards} · undos ${debrief.undos} · evidence ${debrief.evidenceFound}/${debrief.evidenceTotal} · evidence-led ${debrief.evidenceFirst}`}
        position={[0, 0.045, 0.02]} width={0.92} height={0.05} size={0.17} color="#b6c1b8" />
      <ViroText text={debrief.chain.join('\n')} position={[0, -0.09, 0.02]} width={2.4} height={0.62}
        style={{ fontSize: 16, color: '#b6c1b8', textAlign: 'left' }} scale={[0.18, 0.18, 0.18]} />
      <ConsoleButton label="New case" position={[-0.17, -0.24, 0.01]} width={0.26} tint="tfSignal" labelColor="#141817" onPress={actions.newCase} />
      <ConsoleButton label="Keep exploring" position={[0.17, -0.24, 0.01]} width={0.26} onPress={actions.closeDebrief} />
    </ViroNode>
  );
}

export default function QuestConsole({ snap, actions, onExit }: {
  snap: TimeFoldSnapshot;
  actions: TimeFoldActions;
  onExit: () => void;
}) {
  const [confirmCase, setConfirmCase] = useState(false);
  const { session } = snap;
  const game = session.game;
  const fields = chapterFields[session.chapter];
  const selected = session.selected;
  const resetPending = session.pendingReset !== null;
  const evidenceChip = (clue: ClueId, x: number) => {
    const locked = clueChapters[clue] > game.unlocked;
    const found = game.evidence.includes(clue);
    const label = locked ? `${CLUE_NAME[clue]} · ch ${clueChapters[clue]}` : found ? `✓ ${CLUE_NAME[clue]}` : CLUE_ERA[clue];
    return (
      <ConsoleButton key={clue} label={label} position={[x, 0.095, 0.01]} width={0.3}
        disabled={locked} tint={found ? 'tfSignal' : 'tfBrass'}
        labelColor={found ? '#141817' : '#141817'}
        onPress={() => actions.dispatch({ kind: 'inspect', clue })} />
    );
  };
  return (
    <ViroNode position={[0, -0.45, -0.65]} rotation={[-35, 0, 0]}>
      <ViroBox position={[0, 0, 0]} width={1.0} height={0.55} length={0.025} materials="tfPanel" />
      <ViroBox position={[0, 0.275, 0]} width={1.0} height={0.015} length={0.03} materials="tfBrass" />
      <ViroBox position={[0, -0.275, 0]} width={1.0} height={0.015} length={0.03} materials="tfBrass" />
      <ViroBox position={[-0.5, 0, 0]} width={0.015} height={0.55} length={0.03} materials="tfBrass" />
      <ViroBox position={[0.5, 0, 0]} width={0.015} height={0.55} length={0.03} materials="tfBrass" />
      {snap.debriefOpen ? <DebriefPanel snap={snap} actions={actions} /> : (
        <ViroNode>
          <SceneLabel text={caseLabel(game.scenario)} position={[-0.34, 0.22, 0.02]} width={0.3} height={0.06} size={0.24} color="#d7b47b" />
          {([1, 2, 3] as const).map((chapter, i) => {
            const complete = chapterComplete(game, chapter);
            const locked = chapter > game.unlocked;
            const current = chapter === session.chapter;
            return (
              <ConsoleButton key={chapter} label={`${complete ? '✓ ' : ''}CH${chapter}`}
                position={[0.06 + i * 0.15, 0.215, 0.01]} width={0.135}
                disabled={locked} tint={current ? 'tfBrass' : 'tfDark'} labelColor={current ? '#141817' : '#eee9df'}
                onPress={() => actions.dispatch({ kind: 'chapter', chapter })} />
            );
          })}
          <SceneLabel text={chapterContent[session.chapter].objective} position={[0, 0.165, 0.02]} width={0.94} height={0.05} size={0.18} color="#eee9df" />
          {(['wiring', 'sky', 'plaque'] as const).map((clue, i) => evidenceChip(clue, -0.33 + i * 0.33))}
          {resetPending ? (
            <ViroNode>
              <SceneLabel text={`Reset chapter ${session.pendingReset}? Progress in it is lost.`} position={[0, -0.02, 0.02]} width={0.9} height={0.06} size={0.22} color="#c96a52" />
              <ConsoleButton label="Confirm reset" position={[-0.17, -0.1, 0.01]} width={0.28} tint="tfHazard"
                onPress={() => actions.dispatch({ kind: 'confirmReset', chapter: session.pendingReset! })} />
              <ConsoleButton label="Keep playing" position={[0.17, -0.1, 0.01]} width={0.28} tint="tfBrass" labelColor="#141817"
                onPress={() => actions.dispatch({ kind: 'cancelReset' })} />
            </ViroNode>
          ) : selected ? (
            <ViroNode>
              <SceneLabel text={objectNames[selected]} position={[-0.34, -0.02, 0.02]} width={0.3} height={0.06} size={0.24} color="#8be0c4" />
              <ConsoleButton label="Cancel" position={[0.4, -0.02, 0.01]} width={0.15}
                onPress={() => actions.dispatch({ kind: 'select', field: selected })} />
              {placementChoices(selected).map((choice, i) => (
                <ConsoleButton key={choice.label}
                  label={game.state[selected] === choice.action.value ? `· ${choice.label}` : choice.label}
                  position={[-0.31 + i * 0.31, -0.1, 0.01]} width={0.28}
                  tint={game.state[selected] === choice.action.value ? 'tfBrass' : 'tfDark'}
                  labelColor={game.state[selected] === choice.action.value ? '#141817' : '#eee9df'}
                  onPress={() => actions.dispatch({ kind: 'placeChoice', index: i })} />
              ))}
            </ViroNode>
          ) : (
            <ViroNode>
              {fields.map((field: PuzzleField, i: number) => (
                <ConsoleButton key={field} label={objectNames[field]} position={[-0.31 + i * 0.31, -0.04, 0.01]} width={0.28}
                  tint={snap.highlights.includes(field) ? 'tfBrass' : 'tfDark'}
                  labelColor={snap.highlights.includes(field) ? '#141817' : '#eee9df'}
                  onPress={() => actions.dispatch({ kind: 'select', field })} />
              ))}
            </ViroNode>
          )}
          <ViroNode>
            <ConsoleButton label="Undo" position={[-0.37, -0.175, 0.01]} width={0.18}
              disabled={snap.busy || !game.history.length || resetPending} onPress={() => actions.dispatch({ kind: 'undo' })} />
            <ConsoleButton label={`Hint ${'●'.repeat(snap.hintLevel)}${'○'.repeat(3 - snap.hintLevel)}`} position={[-0.135, -0.175, 0.01]} width={0.24}
              disabled={snap.busy || resetPending} onPress={() => actions.ask('hint')} />
            <ConsoleButton label="Explain" position={[0.105, -0.175, 0.01]} width={0.19}
              disabled={snap.busy || resetPending} onPress={() => actions.ask('explain')} />
            <ConsoleButton label="Save" position={[0.33, -0.175, 0.01]} width={0.18}
              disabled={snap.busy || resetPending} onPress={() => void actions.save()} />
            <ConsoleButton label="Tier" position={[0.465, -0.175, 0.01]} width={0.11}
              disabled={snap.busy} onPress={actions.cycleHint} />
          </ViroNode>
          <ViroNode>
            <ConsoleButton label="Reset ch." position={[-0.3, -0.245, 0.01]} width={0.2}
              disabled={snap.busy || resetPending} onPress={() => actions.dispatch({ kind: 'requestReset' })} />
            <ConsoleButton label={confirmCase ? 'Confirm new case?' : 'New case'} position={[0, -0.245, 0.01]} width={0.26}
              tint={confirmCase ? 'tfHazard' : 'tfDark'} disabled={snap.busy || resetPending}
              onPress={() => { if (confirmCase) { setConfirmCase(false); actions.newCase(); } else setConfirmCase(true); }} />
            <ConsoleButton label="Exit" position={[0.34, -0.245, 0.01]} width={0.2} onPress={onExit} />
          </ViroNode>
        </ViroNode>
      )}
      <ViroNode position={[0, -0.3, -0.02]}>
        <SceneLabel text={snap.keeper} position={[0, 0.012, 0]} width={0.95} height={0.06} size={0.18} color="#8be0c4" opacity={0.9} />
        {session.trace && (
          <ViroNode>
            <SceneLabel text={`PAST · ${session.trace.past}`} position={[0, -0.04, 0]} width={0.95} height={0.045} size={0.16} color="#d7b47b" />
            <SceneLabel text={`PRESENT · ${session.trace.present}`} position={[0, -0.083, 0]} width={0.95} height={0.045} size={0.16}
              color={game.state.fuse === 'bypass' ? '#c96a52' : '#b6c1b8'} />
            <SceneLabel text={`FUTURE · ${session.trace.future}`} position={[0, -0.126, 0]} width={0.95} height={0.045} size={0.16} color="#eee9df" />
          </ViroNode>
        )}
      </ViroNode>
    </ViroNode>
  );
}
