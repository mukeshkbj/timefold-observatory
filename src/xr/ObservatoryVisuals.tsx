import { useEffect, useState } from 'react';
import { ViroBox, ViroNode, ViroSphere } from '@reactvision/react-viro';
import { buildEraVisuals } from '../../shared/presentation';
import type { Scenario, TimeFoldState } from '../../shared/timefold';
import SceneLabel from './SceneLabel';
import EraObservatory from './diorama/EraObservatory';
import './diorama/materials';
import type { Interaction } from './diorama/types';

export function useLaggedValue<T>(value: T, ms: number): T {
  const [lagged, setLagged] = useState(value);
  useEffect(() => {
    if (Object.is(lagged, value)) return;
    const timer = setTimeout(() => setLagged(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms, lagged]);
  return lagged;
}

export default function ObservatoryVisuals({ state, scenario, interaction = null, ripple = null, arrived = true }: {
  state: TimeFoldState;
  scenario: Scenario;
  interaction?: Interaction | null;
  ripple?: { id: number | string; hazard: boolean; delay?: number } | null;
  arrived?: boolean;
}) {
  const presentState = useLaggedValue(state, 450);
  const futureState = useLaggedValue(state, 900);
  const [settled, setSettled] = useState(arrived);
  useEffect(() => {
    if (!arrived || settled) return;
    const timer = setTimeout(() => setSettled(true), 1900);
    return () => clearTimeout(timer);
  }, [arrived, settled]);
  const layers = [
    buildEraVisuals(state, scenario)[0],
    buildEraVisuals(presentState, scenario)[1],
    buildEraVisuals(futureState, scenario)[2],
  ];
  const animating = arrived && !settled;
  const scale = settled ? 1 : 0.01;
  return (
    <ViroNode lightReceivingBitMask={3} shadowCastingBitMask={2}>
      <ViroBox position={[0, -0.24, 0.45]} width={2.4} height={0.045} length={0.08} materials="tfBrass" />
      {layers.map((layer, i) => (
        <ViroNode key={layer.era} scale={[scale, scale, scale]} position={[0, settled ? 0 : -0.15, 0]}
          animation={animating ? { name: 'tfArrive', run: true, loop: false, delay: i * 220 } : undefined}>
          <EraObservatory layer={layer} interaction={interaction} />
          <SceneLabel text={layer.year} position={[layer.x, 0.85, -0.05]} width={0.9} height={0.22} size={0.55} color="#d7b47b"
            opacity={settled ? 1 : 0}
            animation={animating ? { name: 'tfLabelIn', run: true, loop: false, delay: 700 + i * 220 } : undefined} />
          <SceneLabel text={layer.label} position={[layer.x, -0.21, 0.48]} width={1.0} height={0.07} size={0.16} color="#d7b47b"
            opacity={settled ? 0.8 : 0}
            animation={animating ? { name: 'tfLabelInDim', run: true, loop: false, delay: 750 + i * 220 } : undefined} />
          <SceneLabel text={layer.status} position={[layer.x, -0.29, 0.48]} width={0.95} height={0.1} size={0.2}
            color={layer.hazard ? '#c96a52' : layer.era === 'future' && layer.signalRecovered ? '#8be0c4' : '#eee9df'}
            opacity={settled ? 1 : 0}
            animation={animating ? { name: 'tfLabelIn', run: true, loop: false, delay: 750 + i * 220 } : undefined} />
        </ViroNode>
      ))}
      {ripple && (
        <ViroSphere key={ripple.id} position={[-1.15, -0.21, 0.45]} radius={0.055} scale={[1.4, 0.3, 1.4]}
          materials={ripple.hazard ? 'tfHazard' : 'tfSignal'} opacity={0.85}
          animation={{ name: 'tfRippleTravel', run: true, loop: false, delay: ripple.delay ?? 0 }} />
      )}
    </ViroNode>
  );
}
