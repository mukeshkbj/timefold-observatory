import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { ViroAmbientLight, ViroARPlaneSelector, ViroARScene, ViroNode, ViroText } from '@reactvision/react-viro';
import TimeFoldContent from './TimeFoldContent';

export default function TimeFoldPhoneScene({ onArAlive }: { onArAlive?: () => void }) {
  const selector = useRef<ViroARPlaneSelector>(null);
  const [selected, setSelected] = useState(false);
  const alive = useRef(false);
  const markAlive = () => { if (!alive.current) { alive.current = true; onArAlive?.(); } };
  return <ViroARScene onAnchorFound={anchor => { markAlive(); selector.current?.handleAnchorFound(anchor); }}
    onAnchorUpdated={anchor => selector.current?.handleAnchorUpdated(anchor)}
    onAnchorRemoved={anchor => { if (anchor) selector.current?.handleAnchorRemoved(anchor); }}
    onTrackingUpdated={state => { if (state === 3) markAlive(); }}>
    <ViroAmbientLight color="#ffffff" intensity={650} />
    {!selected && <ViroText text="Scan a tabletop, then tap a highlighted plane to place the observatory." position={[0, 0, -1.5]} width={1.4} height={0.25} style={{ fontSize: 20, color: '#ffffff', textAlign: 'center' }} />}
    <ViroARPlaneSelector ref={selector} minWidth={0.7} minHeight={0.5} onPlaneSelected={() => setSelected(true)}>
      <ViroNode scale={[0.55, 0.55, 0.55]}><TimeFoldContent onExit={() => router.replace('/')} /></ViroNode>
    </ViroARPlaneSelector>
  </ViroARScene>;
}
