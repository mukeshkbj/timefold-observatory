import { ViroBox, ViroNode, ViroOmniLight, ViroSphere } from '@reactvision/react-viro';
import type { EraVisual } from '../../../shared/presentation';
import './materials';
import { Beacon, BenchObjects, CablePath, SOCKET_POSITIONS, BYPASS_POSITION, Telescope } from './parts';
import { DustMotes, SignalMotes, SmokeWisps, Sparks, StarSparkle } from './particles';
import type { Interaction } from './types';

const STAR_X = { left: -0.3, centre: 0, right: 0.3 } as const;
const BAND_NOTCH = { low: -0.04, mid: 0, high: 0.04 } as const;

function Skeleton({ layer, children }: { layer: EraVisual; children?: React.ReactNode }) {
  const frame = layer.era === 'future' ? 'tfDusty' : 'tfBrass';
  return (
    <ViroNode>
      <ViroBox position={[0, -0.035, 0]} width={0.72} height={0.07} length={0.84}
        materials={layer.era === 'past' ? 'tfWood' : 'tfFloor'} />
      <ViroBox position={[0, 0.015, 0.41]} width={0.68} height={0.035} length={0.035} materials="tfBrass" />
      <ViroBox position={[-0.35, 0.35, -0.36]} width={0.04} height={0.72} length={0.04}
        rotation={layer.era === 'future' ? [0, 0, -6] : [0, 0, 0]} materials={frame} />
      <ViroBox position={[0.35, 0.35, -0.36]} width={0.04} height={0.72} length={0.04} materials={frame} />
      <ViroBox position={[0, 0.69, -0.36]} width={0.72} height={0.045} length={0.05}
        rotation={layer.era === 'future' ? [0, 0, -4] : [0, 0, 0]} materials={frame} />
      {children}
    </ViroNode>
  );
}

function PastExtras({ layer }: { layer: EraVisual }) {
  return (
    <ViroNode>
      <ViroSphere position={[-0.31, 0.52, 0.2]} radius={0.03} materials="tfLight" />
      <ViroBox position={[-0.31, 0.36, 0.2]} width={0.012} height={0.28} length={0.012} materials="tfBrass" />
      <ViroOmniLight color="#ffdf9e" intensity={90} attenuationStartDistance={0.12} attenuationEndDistance={0.9}
        position={[-0.31, 0.52, 0.2]} />
      <Sparks position={BYPASS_POSITION} run={layer.hazard} />
    </ViroNode>
  );
}

function PresentExtras({ layer, interaction }: { layer: EraVisual; interaction: Interaction | null }) {
  const { scenario } = layer;
  const socket = SOCKET_POSITIONS[scenario.socket];
  const found = interaction?.evidence.includes('wiring') ?? false;
  const inspect = interaction ? () => interaction.onInspect('wiring') : undefined;
  return (
    <ViroNode>
      {/* Cracked bench cover: two weathered plates with a gap revealing the cable */}
      <ViroBox position={[-0.3, 0.045, 0.31]} width={0.12} height={0.014} length={0.18} rotation={[0, 0, 3]} materials="tfDusty" />
      <ViroBox position={[0.1, 0.042, 0.32]} width={0.16} height={0.014} length={0.16} rotation={[0, 8, -4]} materials="tfDusty" />
      {/* Exposed wiring clue: copper cable running from the motor housing to the socket it feeds */}
      <CablePath from={[0.24, 0.12, 0.1]} to={socket} />
      {found && <ViroSphere position={socket} radius={0.085} scale={[1, 0.2, 1]} materials="tfSignal" opacity={0.35} />}
      <ViroBox position={[-0.04, 0.08, 0.17]} width={0.34} height={0.1} length={0.24} materials="tfHit"
        onClick={inspect} ignoreEventHandling={!inspect} />
      {layer.hazard && (
        <>
          <ViroBox position={[BYPASS_POSITION[0], 0.045, BYPASS_POSITION[2]]} width={0.2} height={0.02} length={0.18} rotation={[0, 12, 0]} materials="tfScorch" />
          <SmokeWisps position={[BYPASS_POSITION[0], 0.12, BYPASS_POSITION[2]]} run={true} />
        </>
      )}
      <DustMotes run={true} />
    </ViroNode>
  );
}

function FutureExtras({ layer, interaction }: { layer: EraVisual; interaction: Interaction | null }) {
  const { scenario } = layer;
  const evidence = interaction?.evidence ?? [];
  const inspect = (clue: 'sky' | 'plaque') => interaction ? () => interaction.onInspect(clue) : undefined;
  const starX = STAR_X[scenario.bearing];
  return (
    <ViroNode>
      {/* Ruined dome: broken ribs, rubble, vines — the open shell is why the sky clue is visible */}
      <ViroBox position={[-0.13, 0.44, -0.02]} rotation={[0, 0, 34]} width={0.012} height={0.26} length={0.012} materials="tfDusty" />
      <ViroBox position={[0, 0.49, -0.02]} width={0.012} height={0.17} length={0.012} materials="tfDusty" />
      <ViroBox position={[0.14, 0.42, -0.02]} rotation={[0, 0, -38]} width={0.012} height={0.24} length={0.012} materials="tfDusty" />
      <ViroBox position={[0.2, 0.06, 0.1]} rotation={[0, 24, 78]} width={0.012} height={0.2} length={0.012} materials="tfDusty" />
      <ViroBox position={[-0.24, 0.025, 0.05]} rotation={[0, 18, 0]} width={0.14} height={0.02} length={0.1} materials="tfStone" />
      <ViroBox position={[0.17, 0.02, 0.34]} rotation={[0, -30, 0]} width={0.11} height={0.015} length={0.08} materials="tfFuture" />
      {([
        [-0.22, 0.035, 0.3, 16], [-0.12, 0.04, 0.34, -20], [-0.3, 0.03, 0.14, 30],
        [0.3, 0.025, 0.05, -10], [-0.05, 0.05, -0.2, 25],
      ] as const).map((v, i) => (
        <ViroBox key={i} position={[v[0], v[1], v[2]]} rotation={[0, v[3], v[3] / 4]} width={0.05} height={0.035} length={0.05} materials="tfOvergrown" />
      ))}
      {/* Sky clue: the signal star's bearing through the broken dome */}
      <ViroNode position={[starX, 1.0, -0.42]}>
        <ViroSphere radius={0.05} materials="tfSignal"
          animation={{ name: 'tfStarTwinkle', run: true, loop: true }}
          onClick={inspect('sky')} />
        <StarSparkle position={[0, 0, 0]} run={true} />
        {evidence.includes('sky') && <ViroSphere radius={0.075} scale={[1, 1, 0.3]} materials="tfSignal" opacity={0.3} />}
        <ViroBox width={0.14} height={0.14} length={0.14} materials="tfHit" onClick={inspect('sky')} ignoreEventHandling={!interaction} />
      </ViroNode>
      {/* Plaque clue: three etched notches; the recorded band reads deeper */}
      <ViroNode position={[0.31, 0.085, 0.16]} rotation={[-14, 26, 0]}>
        <ViroBox width={0.16} height={0.15} length={0.024} materials="tfStone" onClick={inspect('plaque')} />
        {(Object.keys(BAND_NOTCH) as (keyof typeof BAND_NOTCH)[]).map(band => {
          const etched = scenario.band === band;
          return (
            <ViroBox key={band} position={[BAND_NOTCH[band], 0.02, 0.014]}
              width={0.02} height={etched ? 0.05 : 0.026} length={0.006}
              materials={etched ? 'tfSignal' : 'tfDark'} opacity={etched ? 0.7 : 0.85} />
          );
        })}
        <ViroBox position={[0, -0.02, 0]} width={0.2} height={0.2} length={0.06} materials="tfHit" onClick={inspect('plaque')} ignoreEventHandling={!interaction} />
        {evidence.includes('plaque') && <ViroBox position={[0, 0, -0.02]} width={0.19} height={0.18} length={0.01} materials="tfSignal" opacity={0.25} />}
      </ViroNode>
      {layer.signalRecovered && <SignalMotes position={[-0.27, 0.5, -0.25]} run={true} />}
      {layer.signalRecovered && <ViroOmniLight color="#8be0c4" intensity={140} attenuationStartDistance={0.1} attenuationEndDistance={1.2} position={[0, 0.5, 0]} />}
    </ViroNode>
  );
}

export default function EraObservatory({ layer, interaction }: { layer: EraVisual; interaction: Interaction | null }) {
  const body = layer.era === 'past' ? 'tfPast' : layer.era === 'present' ? 'tfPresent' : 'tfFuture';
  return (
    <ViroNode position={[layer.x, 0, 0]}>
      <Skeleton layer={layer}>
        {layer.era !== 'future' && (
          <ViroSphere position={[0, 0.35, -0.02]} radius={0.23} scale={[1, 1.15, 1]}
            materials={layer.era === 'past' ? 'tfPast' : 'tfDusty'} />
        )}
        <ViroBox position={[0, 0.18, -0.02]} width={0.41} height={0.34} length={0.36} materials={body} />
        <ViroBox position={[0, 0.42, 0.19]} width={0.2} height={0.045} length={0.025}
          materials={layer.powered ? 'tfLight' : 'tfDark'} />
        <ViroBox position={[0.1, 0.17, 0.17]} width={0.09} height={0.06} length={0.02}
          materials={layer.powered ? 'tfLight' : 'tfDark'} />
        <ViroBox position={[-0.08, 0.17, 0.17]} width={0.09} height={0.06} length={0.02}
          materials={layer.powered ? 'tfLight' : 'tfDark'} />
      </Skeleton>
      <Telescope state={layer.state} powered={layer.powered} interaction={interaction} intact={layer.era !== 'future'} />
      <BenchObjects layer={layer} interaction={interaction} editable={layer.era === 'past'} />
      <Beacon layer={layer} />
      {layer.era === 'past' && <PastExtras layer={layer} />}
      {layer.era === 'present' && <PresentExtras layer={layer} interaction={interaction} />}
      {layer.era === 'future' && <FutureExtras layer={layer} interaction={interaction} />}
    </ViroNode>
  );
}
