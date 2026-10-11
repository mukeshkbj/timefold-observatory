import { useCallback, useEffect, useRef, useState } from 'react';
import { exitVRScene, ViroARScene, ViroController, ViroNode } from '@reactvision/react-viro';
import QuestConsole from './QuestConsole';
import TimeFoldContent from './TimeFoldContent';
import { actions, useTimeFold } from './sessionStore';
import type { Point } from './diorama/types';

export default function TimeFoldQuestScene() {
  const snap = useTimeFold();
  const scene = useRef<ViroARScene>(null);
  const [anchor, setAnchor] = useState<{ position: Point; rotation: Point }>({
    position: [0, -0.5, -1.2],
    rotation: [0, 0, 0],
  });
  const recenter = useCallback(async () => {
    try {
      const cam = await scene.current?.getCameraOrientationAsync();
      if (!cam) return;
      const fx = cam.forward?.[0] ?? 0;
      const fz = cam.forward?.[2] ?? -1;
      const len = Math.hypot(fx, fz) || 1;
      const nx = fx / len;
      const nz = fz / len;
      setAnchor({
        position: [cam.position[0] + nx * 1.2, cam.position[1] - 0.5, cam.position[2] + nz * 1.2],
        rotation: [0, Math.atan2(-nx, -nz) * 180 / Math.PI, 0],
      });
    } catch { /* keep the static layout */ }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void recenter(), 600);
    return () => clearTimeout(timer);
  }, [recenter]);
  return <ViroARScene ref={scene}>
    <ViroController reticleVisibility controllerVisibility />
    <ViroNode position={anchor.position} rotation={anchor.rotation}>
      <ViroNode scale={[0.6, 0.6, 0.6]}>
        <TimeFoldContent />
      </ViroNode>
      <ViroNode position={[0, 0.05, 0.55]}>
        <QuestConsole snap={snap} actions={actions} onExit={exitVRScene} onRecenter={() => void recenter()} />
      </ViroNode>
    </ViroNode>
  </ViroARScene>;
}
