import { ViroBox, ViroNode, ViroSphere } from '@reactvision/react-viro';
import { objectNames, placementChoices, type PuzzleField } from '../../../shared/puzzle';
import type { EraVisual } from '../../../shared/presentation';
import SceneLabel from '../SceneLabel';
import './materials';
import type { Interaction, Point } from './types';

// Socket positions are shared across eras — the 2026 wiring clue points at the same A/B locations.
export const SOCKET_POSITIONS = { a: [-0.23, 0.09, 0.26] as Point, b: [-0.23, 0.09, 0.06] as Point };
export const BYPASS_POSITION: Point = [-0.14, 0.07, 0.06];
const PROTECTION_POSITION: Point = [-0.14, 0.07, 0.26];
const CELL_HOME: Point = [-0.28, 0.07, 0.39];
const FUSE_HOME: Point = [-0.16, 0.05, 0.39];
const GEAR_DRIVE: Point = [0.24, 0.17, 0.07];
const GEAR_HOME: Point = [0.26, 0.05, 0.36];
const CRYSTAL_MOUNT: Point = [0.22, 0.12, 0.28];
const CRYSTAL_HOME: Point = [0.27, 0.04, 0.39];
const BAND_X = { low: 0.16, mid: 0.22, high: 0.28 } as const;
const MARKER_YAW = { left: 28, centre: 10, right: -18 } as const;

function HitProxy({ position, size = 0.11, onClick }: { position: Point; size?: number | Point; onClick?: () => void }) {
  const dims: Point = Array.isArray(size) ? size : [size, size, size];
  return <ViroBox position={position} width={dims[0]} height={dims[1]} length={dims[2]} materials="tfHit" onClick={onClick} ignoreEventHandling={!onClick} />;
}

function Selectable({ field, children, interaction, position, size }: {
  field: PuzzleField;
  children: React.ReactNode;
  interaction: Interaction | null;
  position: Point;
  size?: number | Point;
}) {
  const focused = interaction?.selected === field;
  const highlighted = interaction?.highlights.includes(field) ?? false;
  const select = interaction ? () => interaction.onSelect(field) : undefined;
  return (
    <ViroNode position={position} animation={focused ? { name: 'tfSelectPulse', run: true, loop: true } : undefined}>
      {children}
      {focused && <ViroSphere position={[0, -0.055, 0]} radius={0.065} scale={[1, 0.12, 1]} materials="tfSignal" opacity={0.7} />}
      {highlighted && !focused && <ViroSphere position={[0, -0.055, 0]} radius={0.05} scale={[1, 0.1, 1]} materials="tfBrass" opacity={0.8} />}
      <HitProxy position={[0, 0, 0]} size={size} onClick={select} />
    </ViroNode>
  );
}

export function Telescope({ state, powered, interaction, intact }: {
  state: EraVisual['state'];
  powered: boolean;
  interaction: Interaction | null;
  intact: boolean;
}) {
  const yaw = MARKER_YAW[state.alignment];
  return (
    <ViroNode position={[0.025, 0.49, 0.04]} rotation={[-22, yaw, 0]}>
      <ViroBox position={[0, 0, 0]} width={0.062} height={0.062} length={0.33} materials={intact ? 'tfBrass' : 'tfDusty'} opacity={intact ? 1 : 0.9} />
      <ViroBox position={[0, -0.026, 0.08]} width={0.1} height={0.04} length={0.12} materials="tfDark" />
      <ViroSphere position={[0, 0, -0.25]} radius={0.04}
        materials={state.lens === 'optic' ? (powered ? 'tfSignal' : 'tfGlass') : 'tfDark'}
        opacity={state.lens === 'optic' ? 0.95 : 0.55}
        scale={[1, 1, 0.35]} />
      {powered && state.lens === 'optic' && (
        <ViroBox position={[0, 0, -0.3]} width={0.05} height={0.05} length={0.1} materials="tfSignal" opacity={0.3} />
      )}
    </ViroNode>
  );
}

function DestinationMarkers({ layer, interaction }: { layer: EraVisual; interaction: Interaction | null }) {
  if (!interaction?.selected) return null;
  const field = interaction.selected;
  const choices = placementChoices(field);
  const currentIndex = choices.findIndex(choice => choice.action.value === layer.state[field]);
  const marker = (position: Point, index: number) => (
    <ViroSphere key={`${field}-${index}`} position={position} radius={0.028} scale={[1, 0.45, 1]}
      materials={index === currentIndex ? 'tfBrass' : 'tfSignal'}
      opacity={index === currentIndex ? 0.5 : 0.95}
      animation={index === currentIndex ? undefined : { name: 'tfTargetPulse', run: true, loop: true }}
      onClick={() => interaction.onPlace(index)} />
  );
  const targets: { position: Point; index: number }[] = (() => {
    switch (field) {
      case 'cell': return [
        { position: CELL_HOME, index: 0 },
        { position: SOCKET_POSITIONS.a, index: 1 },
        { position: SOCKET_POSITIONS.b, index: 2 },
      ];
      case 'fuse': return [
        { position: FUSE_HOME, index: 0 },
        { position: PROTECTION_POSITION, index: 1 },
        { position: BYPASS_POSITION, index: 2 },
      ];
      case 'gear': return [
        { position: GEAR_HOME, index: 0 },
        { position: GEAR_DRIVE, index: 1 },
      ];
      case 'lens': return [
        { position: [0.13, 0.04, 0.39], index: 0 },
        { position: [0.025, 0.52, -0.15], index: 1 },
      ];
      case 'crystal': return [
        { position: CRYSTAL_HOME, index: 0 },
        { position: CRYSTAL_MOUNT, index: 1 },
      ];
      case 'alignment': return (Object.keys(MARKER_YAW) as (keyof typeof MARKER_YAW)[]).map((key, index) => ({
        position: [[-0.13, 0.78, -0.12], [0.025, 0.79, -0.12], [0.18, 0.78, -0.12]][index] as Point,
        index,
      }));
      case 'frequency': return (Object.keys(BAND_X) as (keyof typeof BAND_X)[]).map((key, index) => ({
        position: [BAND_X[key], 0.135, 0.35] as Point,
        index,
      }));
      default: return [];
    }
  })();
  return <>{targets.map(target => marker(target.position, target.index))}</>;
}

export function BenchObjects({ layer, interaction, editable }: {
  layer: EraVisual;
  interaction: Interaction | null;
  editable: boolean;
}) {
  const { state } = layer;
  const inter = editable ? interaction : null;
  const sockets = (
    <>
      <ViroBox position={[SOCKET_POSITIONS.a[0], 0.025, SOCKET_POSITIONS.a[2]]} width={0.16} height={0.035} length={0.14} materials="tfDark" />
      <ViroBox position={[SOCKET_POSITIONS.b[0], 0.025, SOCKET_POSITIONS.b[2]]} width={0.16} height={0.035} length={0.14} materials="tfDark" />
      <ViroBox position={[PROTECTION_POSITION[0], 0.022, PROTECTION_POSITION[2]]} width={0.15} height={0.03} length={0.12} materials="tfDark" />
      <ViroBox position={[BYPASS_POSITION[0], 0.022, BYPASS_POSITION[2]]} width={0.15} height={0.03} length={0.12} materials="tfDark" />
    </>
  );
  const cellPos = state.cell === 'a' ? SOCKET_POSITIONS.a : state.cell === 'b' ? SOCKET_POSITIONS.b : CELL_HOME;
  const fusePos = state.fuse === 'protected' ? PROTECTION_POSITION : state.fuse === 'bypass' ? BYPASS_POSITION : FUSE_HOME;
  const gearPos = state.gear === 'drive' ? GEAR_DRIVE : GEAR_HOME;
  const crystalPos = state.crystal === 'receiver' ? CRYSTAL_MOUNT : CRYSTAL_HOME;
  return (
    <ViroNode>
      {sockets}
      <Selectable field="cell" interaction={inter} position={cellPos} size={0.12}>
        <ViroBox width={0.07} height={0.095} length={0.11} materials="tfPast" />
        <ViroBox position={[0, 0.062, 0.01]} width={0.022} height={0.026} length={0.022} materials="tfLight" />
      </Selectable>
      <Selectable field="fuse" interaction={inter} position={fusePos} size={0.12}>
        <ViroBox width={0.07} height={0.07} length={0.09} materials={state.fuse === 'bypass' ? 'tfHazard' : 'tfBrass'} />
      </Selectable>
      <Selectable field="gear" interaction={inter} position={gearPos} size={0.12}>
        <ViroNode animation={layer.powered && state.gear === 'drive' ? { name: 'tfGearSpin', run: true, loop: true } : undefined}>
          <ViroSphere radius={0.065} scale={[1, 0.32, 1]} materials="tfBrass" />
          {[0, 45, 90, 135].map(angle => (
            <ViroBox key={angle} position={[0, 0.012, 0]} width={0.018} height={0.02} length={0.128}
              rotation={[0, angle, 0]} materials="tfDark" />
          ))}
        </ViroNode>
      </Selectable>
      {state.gear === 'drive' && <ViroBox position={[0.22, 0.17, 0.07]} width={0.1} height={0.12} length={0.06} materials="tfDark" opacity={0.9} />}
      {state.lens !== 'optic' && (
        <Selectable field="lens" interaction={inter} position={[0.13, 0.04, 0.39]} size={0.12}>
          <ViroSphere radius={0.05} scale={[1, 1, 0.35]} materials="tfGlass" />
        </Selectable>
      )}
      {inter?.selected === 'lens' && (
        <ViroNode position={[0.025, 0.49, 0.04]} rotation={[-22, MARKER_YAW[state.alignment], 0]}>
          <ViroSphere position={[0, 0, -0.25]} radius={0.055} scale={[1, 1, 0.35]} materials="tfSignal" opacity={0.4}
            animation={{ name: 'tfTargetPulse', run: true, loop: true }}
            onClick={() => inter.onPlace(placementChoices('lens').findIndex(c => c.action.value === 'optic'))} />
        </ViroNode>
      )}
      <Selectable field="crystal" interaction={inter} position={crystalPos} size={0.12}>
        <ViroSphere radius={0.045} scale={[0.8, 1.4, 0.8]} materials="tfGlass" />
      </Selectable>
      {state.crystal === 'receiver' && (
        <ViroBox position={[0.22, 0.055, 0.28]} width={0.13} height={0.1} length={0.12} materials={editable ? 'tfPast' : 'tfDusty'} opacity={0.9} />
      )}
      <Selectable field="frequency" interaction={inter} position={[BAND_X[state.frequency], 0.068, 0.35]} size={0.1}>
        <ViroBox width={0.055} height={0.018} length={0.055} materials="tfBrass" />
      </Selectable>
      {(Object.keys(BAND_X) as (keyof typeof BAND_X)[]).map(band => (
        <ViroBox key={band} position={[BAND_X[band], 0.056, 0.35]} width={0.02} height={0.02} length={0.02} materials="tfDark" />
      ))}
      {inter?.selected === 'alignment' && (
        <SceneLabel text={objectNames.alignment} position={[0, 0.84, -0.1]} width={0.5} height={0.05} size={0.26} color="#8be0c4" />
      )}
      <DestinationMarkers layer={layer} interaction={inter} />
    </ViroNode>
  );
}

export function CablePath({ from, to }: { from: Point; to: Point }) {
  const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.02, 0.18];
  const waypoints: Point[] = [from, mid, to];
  return (
    <>
      {waypoints.slice(0, -1).map((a, i) => {
        const b = waypoints[i + 1];
        const dx = b[0] - a[0];
        const dz = b[2] - a[2];
        const dy = b[1] - a[1];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
        const pitch = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180 / Math.PI;
        return (
          <ViroBox key={i} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}
            rotation={[pitch, yaw, 0]} width={0.012} height={0.012} length={length} materials="tfCopper" />
        );
      })}
    </>
  );
}

export function Beacon({ layer }: { layer: EraVisual }) {
  const live = layer.powered;
  return (
    <ViroNode>
      <ViroBox position={[-0.27, 0.22, -0.25]} width={0.02} height={0.42} length={0.02} materials={layer.era === 'future' ? 'tfDusty' : 'tfBrass'} />
      <ViroSphere position={[-0.27, 0.45, -0.25]} radius={0.035}
        materials={layer.signalRecovered ? 'tfSignal' : live ? 'tfLight' : 'tfDark'}
        animation={layer.signalRecovered ? { name: 'tfBeaconPulse', run: true, loop: true } : undefined} />
      {layer.signalRecovered && (
        <>
          <ViroBox position={[-0.27, 0.72, -0.25]} width={0.014} height={0.5} length={0.014} materials="tfSignal" opacity={0.42} />
          <ViroSphere position={[-0.27, 0.45, -0.25]} radius={0.05}
            animation={{ name: 'tfSignalBurst', run: true, loop: true, delay: 250 }} materials="tfSignal" opacity={0.8} />
        </>
      )}
      {layer.era === 'present' && layer.aimed && (
        <ViroSphere position={[0.42, 1.08, -0.42]} radius={0.07} materials="tfSignal" opacity={0.85} />
      )}
    </ViroNode>
  );
}
