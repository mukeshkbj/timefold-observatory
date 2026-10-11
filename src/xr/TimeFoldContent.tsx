import { useEffect } from 'react';
import { ViroNode, ViroOmniLight, ViroSound } from '@reactvision/react-viro';
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
  useEffect(() => actions.init(), []);
  const game = snap.session.game;
  return (
    <ViroNode>
      <ViroOmniLight color="#f1e0b4" intensity={130}
        attenuationStartDistance={0.8} attenuationEndDistance={6} position={[0, 2.2, 0.9]} />
      <ViroOmniLight color="#9fd8c4" intensity={70}
        attenuationStartDistance={1} attenuationEndDistance={7} position={[0, 2, -1.6]} />
      <ObservatoryVisuals
        state={game.state}
        scenario={game.scenario}
        ripple={snap.ripple}
        interaction={{
          selected: snap.session.selected,
          highlights: snap.highlights,
          evidence: game.evidence,
          onSelect: field => actions.dispatch({ kind: 'select', field }),
          onPlace: index => actions.dispatch({ kind: 'placeChoice', index }),
          onInspect: clue => actions.dispatch({ kind: 'inspect', clue }),
        }} />
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
