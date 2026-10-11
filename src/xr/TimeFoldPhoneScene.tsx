import { useRef } from 'react';
import { ViroARPlaneSelector, ViroARScene, ViroNode } from '@reactvision/react-viro';
import TimeFoldContent from './TimeFoldContent';
import { actions } from './sessionStore';

export default function TimeFoldPhoneScene({ onArAlive }: { onArAlive?: () => void }) {
  const selector = useRef<ViroARPlaneSelector>(null);
  const alive = useRef(false);
  const placed = useRef(false);
  const markAlive = () => { if (!alive.current) { alive.current = true; onArAlive?.(); } };
  return <ViroARScene onAnchorFound={anchor => { markAlive(); if (!placed.current) actions.setPlacement('surface'); selector.current?.handleAnchorFound(anchor); }}
    onAnchorUpdated={anchor => { markAlive(); selector.current?.handleAnchorUpdated(anchor); }}
    onAnchorRemoved={anchor => { if (anchor) selector.current?.handleAnchorRemoved(anchor); }}
    onTrackingUpdated={state => { if (state === 3) markAlive(); }}>
    <ViroARPlaneSelector ref={selector} minWidth={0.7} minHeight={0.5}
      alignment="Horizontal"
      onPlaneSelected={() => { placed.current = true; actions.setPlacement('placed'); }}>
      <ViroNode scale={[0.4, 0.4, 0.4]}>
        <TimeFoldContent />
      </ViroNode>
    </ViroARPlaneSelector>
  </ViroARScene>;
}
