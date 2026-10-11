import { useEffect, useRef, useState } from 'react';
import { isQuest, ViroAmbientLight, ViroDirectionalLight, ViroNode, ViroOmniLight, ViroQuad, ViroSound } from '@reactvision/react-viro';
import ObservatoryVisuals from './ObservatoryVisuals';
import { actions, useTimeFold } from './sessionStore';

const SFX = {
  place: require('../../assets/audio/place-chime.wav'),
  hazard: require('../../assets/audio/hazard.wav'),
  inspect: require('../../assets/audio/inspect.wav'),
  signal: require('../../assets/audio/signal.wav'),
  ripple: require('../../assets/audio/ripple.wav'),
};

export default function TimeFoldContent() {
  const snap = useTimeFold();
  const [arrived, setArrived] = useState(false);
  const [arrivalRippleSfx, setArrivalRippleSfx] = useState(false);
  const arrivalDone = useRef(false);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => actions.init(), []);
  useEffect(() => () => { if (arrivalTimer.current) clearTimeout(arrivalTimer.current); }, []);
  useEffect(() => {
    if (arrivalDone.current || snap.busy || !(snap.placement === 'placed' || isQuest)) return;
    // Phone mounts this component inside ViroARPlaneSelector, which only renders
    // children once a plane is selected — so 'placed' is already set on mount.
    // Quest mounts immediately, so gate on the store being ready instead.
    arrivalDone.current = true;
    arrivalTimer.current = setTimeout(() => {
      setArrived(true);
      arrivalTimer.current = setTimeout(() => setArrivalRippleSfx(true), 1050);
    }, 0);
  }, [snap.busy, snap.placement]);
  const game = snap.session.game;
  return (
    <ViroNode>
      <ViroAmbientLight color="#ffffff" intensity={300} />
      <ViroDirectionalLight color="#fff1d6" direction={[-0.35, -1, -0.45]} intensity={600}
        castsShadow shadowOpacity={0.5} shadowMapSize={2048}
        shadowOrthographicSize={3} shadowOrthographicPosition={[0, 0.4, 0]} influenceBitMask={2} />
      <ViroOmniLight color="#f1e0b4" intensity={130}
        attenuationStartDistance={0.8} attenuationEndDistance={6} position={[0, 2.2, 0.9]} />
      <ViroOmniLight color="#9fd8c4" intensity={70}
        attenuationStartDistance={1} attenuationEndDistance={7} position={[0, 2, -1.6]} />
      <ViroQuad position={[0, -0.075, 0]} rotation={[-90, 0, 0]} width={3.2} height={1.2}
        arShadowReceiver lightReceivingBitMask={2} />
      <ObservatoryVisuals
        state={game.state}
        scenario={game.scenario}
        ripple={snap.ripple ?? (arrived ? { id: 'arrival', hazard: false, delay: 1100 } : null)}
        arrived={arrived}
        interaction={{
          selected: snap.session.selected,
          highlights: snap.highlights,
          evidence: game.evidence,
          onSelect: field => actions.dispatch({ kind: 'select', field }),
          onPlace: index => actions.dispatch({ kind: 'placeChoice', index }),
          onInspect: clue => actions.dispatch({ kind: 'inspect', clue }),
        }} />
      {arrived && (
        <ViroSound key="arrival-chime" source={SFX.place} volume={0.55} />
      )}
      {arrivalRippleSfx && (
        <ViroSound key="arrival-ripple" source={SFX.ripple} volume={0.22} />
      )}
      {snap.sfx && (
        <ViroSound key={snap.sfx.id} source={SFX[snap.sfx.kind]}
          volume={snap.sfx.kind === 'hazard' ? 0.7 : 0.55}
          onFinish={() => actions.clearSfx(snap.sfx?.id ?? -1)}
          onError={() => actions.clearSfx(snap.sfx?.id ?? -1)} />
      )}
      {snap.ripple && (
        <ViroSound key={`ripple-${snap.ripple.id}`} source={SFX.ripple} volume={0.22} />
      )}
    </ViroNode>
  );
}
