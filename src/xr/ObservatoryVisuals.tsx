import { ViroAnimations, ViroBox, ViroMaterials, ViroNode, ViroSphere } from '@reactvision/react-viro';
import type { EraVisual } from '../../shared/presentation';
import SceneLabel from './SceneLabel';
import type { PuzzleField } from '../../shared/puzzle';

type Interaction = { selected: PuzzleField | null; highlights: readonly PuzzleField[]; onSelect: (field: PuzzleField) => void; onPlace: (index: number) => void };

type Point = [number, number, number];

const choiceTargets: Readonly<Record<PuzzleField, readonly (Point | null)[]>> = {
  cell: [[-0.28, 0.07, 0.39], [-0.23, 0.09, 0.26], [-0.23, 0.09, 0.06]],
  fuse: [[-0.16, 0.05, 0.39], [-0.14, 0.07, 0.26], [-0.14, 0.07, 0.06]],
  gear: [[0.26, 0.05, 0.36], [0.24, 0.17, 0.07], null],
  lens: [[0.13, 0.04, 0.39], [0.025, 0.52, -0.17], null],
  alignment: [[-0.13, 0.36, 0.12], [0.025, 0.4, 0.12], [0.18, 0.36, 0.12]],
  crystal: [[0.27, 0.04, 0.39], [0.22, 0.12, 0.28], null],
  frequency: [[0.16, 0.068, 0.35], [0.22, 0.068, 0.35], [0.28, 0.068, 0.35]],
};
ViroMaterials.createMaterials({
  tfFloor: { diffuseColor: '#202b29' },
  tfPast: { diffuseColor: '#a38f69' },
  tfPresent: { diffuseColor: '#596b62' },
  tfFuture: { diffuseColor: '#839e8e' },
  tfBrass: { diffuseColor: '#c6a065', lightingModel: 'Blinn', shininess: 42 },
  tfDark: { diffuseColor: '#182323' },
  tfGlass: { diffuseColor: '#5e8995', lightingModel: 'Blinn', shininess: 90 },
  tfLight: { diffuseColor: '#e4c782', lightingModel: 'Constant' },
  tfSignal: { diffuseColor: '#8be0c4', lightingModel: 'Constant' },
  tfHazard: { diffuseColor: '#c96a52', lightingModel: 'Constant' },
  tfOvergrown: { diffuseColor: '#3d5a45' },
  tfPanel: { diffuseColor: '#0e1514', lightingModel: 'Constant', blendMode: 'Alpha', alpha: 0.82 },
});
ViroAnimations.registerAnimations({
  tfGearSpin: { properties: { rotateZ: '+=360' }, duration: 5000 },
  tfBeaconPulse: { properties: { scaleX: '+=0.5', scaleY: '+=0.5', scaleZ: '+=0.5' }, duration: 1200 },
  tfTargetPulse: { properties: { scaleX: '+=0.35', scaleY: '+=0.35', scaleZ: '+=0.35' }, duration: 900 },
  tfSignalBurst: { properties: { scaleX: '+=7', scaleY: '+=7', opacity: '-=1' }, duration: 2400 },
});

function EraObservatory({ layer, interaction }: { layer: EraVisual; interaction: Interaction | null }) {
  const select = (field: PuzzleField) => { if (layer.era === 'past') interaction?.onSelect(field); };
  const focused = (field: PuzzleField) => layer.era === 'past' && (interaction?.selected === field || interaction?.highlights.includes(field));
  const body = layer.era === 'past' ? 'tfPast' : layer.era === 'present' ? 'tfPresent' : 'tfFuture';
  const state = layer.state;
  const installedCell: Point = state.cell === 'a' ? [-0.23, 0.09, 0.26] : state.cell === 'b' ? [-0.23, 0.09, 0.06] : [-0.28, 0.07, 0.39];
  const installedFuse: Point = state.fuse === 'protected' ? [-0.14, 0.07, 0.26] : state.fuse === 'bypass' ? [-0.14, 0.07, 0.06] : [-0.16, 0.05, 0.39];
  const requestedYaw = state.alignment === 'centre' ? 0 : state.alignment === 'left' ? -28 : 28;
  const yaw = layer.era === 'past' || (layer.powered && state.gear === 'drive') ? requestedYaw : -28;
  return (
    <ViroNode position={[layer.x, 0, 0]} viroTag={`era-${layer.era}`}>
      <ViroBox position={[0, -0.035, 0]} width={0.7} height={0.07} length={0.82} materials="tfFloor" />
      <ViroBox position={[0, 0.015, 0.41]} width={0.72} height={0.025} length={0.025} materials="tfBrass" />
      <ViroBox position={[-0.35, 0.35, -0.36]} width={0.018} height={0.7} length={0.018} materials="tfBrass" />
      <ViroBox position={[0.35, 0.35, -0.36]} width={0.018} height={0.7} length={0.018} materials="tfBrass" />
      <ViroBox position={[0, 0.69, -0.36]} width={0.72} height={0.018} length={0.018} materials="tfBrass" />
      <ViroBox position={[0, 0.18, -0.02]} width={0.41} height={0.34} length={0.36} materials={body} />
      <ViroSphere position={[0, 0.35, -0.02]} radius={0.23} widthSegmentCount={20} heightSegmentCount={12} scale={[1, 0.8, 0.9]} materials={body} />
      <ViroBox position={[0, 0.43, 0.19]} width={0.035} height={0.15} length={0.012} materials="tfDark" />
      <ViroBox position={[0.1, 0.17, 0.17]} width={0.07} height={0.12} length={0.016} materials={layer.powered ? 'tfLight' : 'tfDark'} />
      <ViroBox position={[-0.08, 0.17, 0.17]} width={0.07} height={0.12} length={0.016} materials={layer.powered ? 'tfLight' : 'tfDark'} />
      <ViroNode position={[0.025, 0.49, 0.04]} rotation={[-22, yaw, 0]} onClick={() => select('alignment')} viroTag={`${layer.era}-telescope`}>
        <ViroBox width={0.095} height={0.1} length={0.44} materials="tfBrass" />
        <ViroBox position={[0, 0, -0.23]} width={0.115} height={0.12} length={0.03} materials="tfDark" />
        <ViroSphere position={[0, 0, -0.25]} radius={0.045} widthSegmentCount={12} heightSegmentCount={8} scale={[1, 1, 0.15]} materials={focused('lens') ? 'tfSignal' : 'tfGlass'} onClick={() => select('lens')} visible={state.lens === 'optic'} />
      </ViroNode>
      <ViroSphere position={[0.13, 0.04, 0.39]} radius={0.045} widthSegmentCount={12} heightSegmentCount={8} scale={[1, 0.2, 1]} materials={focused('lens') ? 'tfSignal' : 'tfGlass'} onClick={() => select('lens')} visible={state.lens === 'home'} viroTag={`${layer.era}-lens`} />
      <ViroBox position={installedCell} width={0.055} height={0.11} length={0.055} materials={focused('cell') ? 'tfSignal' : 'tfBrass'} onClick={() => select('cell')} viroTag={`${layer.era}-cell`} />
      <ViroBox position={installedFuse} width={0.025} height={0.08} length={0.025} materials={focused('fuse') ? 'tfSignal' : state.fuse === 'bypass' ? 'tfHazard' : 'tfLight'} onClick={() => select('fuse')} viroTag={`${layer.era}-fuse`} />
      <ViroBox position={[-0.22, 0.025, 0.26]} width={0.085} height={0.022} length={0.09} materials="tfDark" />
      <ViroNode position={state.gear === 'drive' ? [0.24, 0.17, 0.07] : [0.26, 0.05, 0.36]} onClick={() => select('gear')} viroTag={`${layer.era}-gear`}
        animation={{ name: 'tfGearSpin', run: layer.era === 'present' && layer.powered && state.gear === 'drive', loop: true }}>
        <ViroSphere radius={0.065} widthSegmentCount={12} heightSegmentCount={8} scale={[1, 1, 0.2]} materials={focused('gear') ? 'tfSignal' : 'tfBrass'} />
        {Array.from({ length: 8 }, (_, index) => {
          const angle = index * Math.PI / 4;
          return <ViroBox key={index} position={[Math.cos(angle) * 0.067, Math.sin(angle) * 0.067, 0]} rotation={[0, 0, index * 45]} width={0.024} height={0.024} length={0.018} materials="tfBrass" />;
        })}
      </ViroNode>
      <ViroBox position={[0.22, 0.055, 0.28]} width={0.13} height={0.1} length={0.12} materials={body} />
      <ViroSphere position={state.crystal === 'receiver' ? [0.22, 0.12, 0.28] : [0.27, 0.04, 0.39]} radius={0.036} widthSegmentCount={6} heightSegmentCount={6} materials={focused('crystal') || layer.signalRecovered ? 'tfSignal' : 'tfGlass'} onClick={() => select('crystal')} viroTag={`${layer.era}-crystal`} />
      <ViroBox position={[state.frequency === 'low' ? 0.16 : state.frequency === 'mid' ? 0.22 : 0.28, 0.068, 0.35]} width={0.085} height={0.015} length={0.015} materials={focused('frequency') || layer.signalRecovered ? 'tfSignal' : 'tfDark'} onClick={() => select('frequency')} />
      <ViroBox position={[-0.27, 0.22, -0.25]} width={0.027} height={0.44} length={0.027} materials={layer.era === 'future' && !layer.powered ? 'tfOvergrown' : 'tfBrass'} />
      <ViroSphere position={[-0.27, 0.45, -0.25]} radius={0.045} widthSegmentCount={10} heightSegmentCount={8} materials={layer.era === 'future' && layer.powered ? 'tfLight' : 'tfDark'}
        animation={{ name: 'tfBeaconPulse', run: layer.era === 'future' && layer.powered, loop: true }} />
      <ViroBox position={[0.22, 0.17, 0.07]} width={0.075} height={0.024} length={0.024} materials="tfDark" visible={state.gear === 'drive'} />
      <ViroSphere position={[0.42, 1.08, -0.42]} radius={0.024} widthSegmentCount={10} heightSegmentCount={8} materials="tfSignal" visible={layer.aimed} />
      {layer.era === 'future' && !layer.powered && (
        <ViroNode>
          <ViroSphere position={[-0.17, 0.47, 0.09]} radius={0.05} widthSegmentCount={8} heightSegmentCount={6} scale={[1, 0.55, 1]} materials="tfOvergrown" />
          <ViroSphere position={[0.16, 0.52, -0.13]} radius={0.06} widthSegmentCount={8} heightSegmentCount={6} scale={[1, 0.5, 1]} materials="tfOvergrown" />
          <ViroBox position={[0.31, 0.06, 0.12]} rotation={[0, 0, 18]} width={0.05} height={0.14} length={0.05} materials="tfOvergrown" />
        </ViroNode>
      )}
      <ViroSphere position={[0, 0.66, -0.28]} radius={0.023} widthSegmentCount={8} heightSegmentCount={6} materials="tfSignal" visible={layer.era === 'future' && layer.signalRecovered} />
      {layer.era === 'future' && layer.signalRecovered && (
        <ViroNode>
          <ViroSphere position={[0, 0.66, -0.28]} radius={0.09} widthSegmentCount={16} heightSegmentCount={10} scale={[1, 1, 0.14]} materials="tfSignal"
            animation={{ name: 'tfSignalBurst', run: true, loop: false }} />
          <ViroBox position={[0.06, 0.62, -0.14]} rotation={[38, 0, 0]} width={0.012} height={0.012} length={0.6} materials="tfSignal" />
          <ViroBox position={[-0.14, 0.34, -0.02]} rotation={[0, 0, -12]} width={0.008} height={0.62} length={0.008} materials="tfSignal" />
        </ViroNode>
      )}
      {layer.era === 'past' && interaction?.selected && choiceTargets[interaction.selected].map((target, index) => target && (
        <ViroSphere key={`${interaction.selected}-${index}`} position={target} radius={0.035} widthSegmentCount={10} heightSegmentCount={8}
          materials="tfSignal" onClick={() => interaction.onPlace(index)} viroTag={`target-${interaction.selected}-${index}`}
          animation={{ name: 'tfTargetPulse', run: true, loop: true }} />
      ))}
      <SceneLabel text={layer.label} position={[0, 0.89, 0.03]} width={0.78} height={0.12} color="#d7b47b" />
      <SceneLabel text={layer.year} position={[0, 0.76, 0.03]} width={0.65} height={0.18} color="#eee9df" size={0.8} />
      <SceneLabel text={layer.status} position={[0, -0.18, 0.56]} width={0.75} height={0.14} color="#eee9df" size={0.35} />
    </ViroNode>
  );
}

export default function ObservatoryVisuals({ layers, interaction = null }: { layers: readonly [EraVisual, EraVisual, EraVisual]; interaction?: Interaction | null }) {
  return (
    <ViroNode>
      <ViroBox position={[0, -0.09, 0.015]} width={2.5} height={0.07} length={0.94} materials="tfDark" />
      {layers.map(layer => <EraObservatory key={layer.era} layer={layer} interaction={interaction} />)}
      <ViroBox position={[0, -0.24, 0.45]} width={2.3} height={0.012} length={0.012} materials="tfBrass" />
      <SceneLabel text="PAST REPAIR  /  PRESENT MECHANISM  /  FUTURE CONSEQUENCE" position={[0, -0.3, 0.47]} width={2.45} height={0.14} color="#d7b47b" size={0.35} />
    </ViroNode>
  );
}
