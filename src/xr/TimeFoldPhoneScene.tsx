import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ViroARPlaneSelector, ViroARScene, ViroNode } from '@reactvision/react-viro';
import TimeFoldContent from './TimeFoldContent';
import { ambientFromEstimate, AMBIENT_DEFAULT, clampScale, faceCameraYaw, lightChanged, SCALE_DEFAULT, trackingHint, type Vec3 } from './arMath';
import { actions, useReplaceRequest } from './sessionStore';

const haptic = (promise: Promise<unknown>) => { promise.catch(() => undefined); };

export default function TimeFoldPhoneScene({ onArAlive }: { onArAlive?: () => void }) {
  const scene = useRef<ViroARScene>(null);
  const selector = useRef<ViroARPlaneSelector>(null);
  const wrapper = useRef<ViroNode>(null);
  const alive = useRef(false);
  const placed = useRef(false);
  const surfaceFelt = useRef(false);
  const light = useRef(AMBIENT_DEFAULT);
  const [pose, setPose] = useState({ scale: SCALE_DEFAULT, yaw: 0 });
  const live = useRef(pose);
  const replaceRequest = useReplaceRequest();
  const lastReplace = useRef(replaceRequest);

  const commit = (next: { scale: number; yaw: number }) => { live.current = next; setPose(next); };
  const markAlive = () => { if (!alive.current) { alive.current = true; onArAlive?.(); } };

  useEffect(() => { actions.setPlacement('scanning'); actions.setTracking(null); }, []);

  useEffect(() => {
    if (replaceRequest === lastReplace.current) return;
    lastReplace.current = replaceRequest;
    placed.current = false;
    selector.current?.reset();
    commit({ scale: SCALE_DEFAULT, yaw: 0 });
    actions.setPlacement('surface');
  }, [replaceRequest]);

  const facePlayer = async (planeYaw: number, tap?: Vec3) => {
    try {
      const cam = await scene.current?.getCameraOrientationAsync();
      const p = cam?.position;
      if (!tap || !Array.isArray(p) || p.length < 3) return;
      commit({ ...live.current, yaw: faceCameraYaw([Number(p[0]), Number(p[1]), Number(p[2])], tap, planeYaw) });
    } catch { /* keep the plane's own orientation */ }
  };

  return <ViroARScene ref={scene}
    onAnchorFound={anchor => { markAlive(); selector.current?.handleAnchorFound(anchor); }}
    onAnchorUpdated={anchor => { markAlive(); selector.current?.handleAnchorUpdated(anchor); }}
    onAnchorRemoved={anchor => { if (anchor) selector.current?.handleAnchorRemoved(anchor); }}
    onTrackingUpdated={(state, reason) => {
      if (state === 3) markAlive();
      const hint = trackingHint(state, reason);
      actions.setTracking(hint === 'unavailable' && !alive.current ? null : hint);
    }}
    onAmbientLightUpdate={update => {
      const next = ambientFromEstimate(update?.intensity, update?.color);
      if (!lightChanged(light.current, next)) return;
      light.current = next;
      actions.setAmbient(next);
    }}>
    <ViroARPlaneSelector ref={selector} minWidth={0.35} minHeight={0.25}
      alignment="Horizontal"
      onPlaneDetected={() => {
        if (!placed.current) {
          actions.setPlacement('surface');
          if (!surfaceFelt.current) { surfaceFelt.current = true; haptic(Haptics.selectionAsync()); }
        }
        return true;
      }}
      onPlaneSelected={(plane, tap) => {
        placed.current = true;
        actions.setPlacement('placed');
        haptic(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        void facePlayer(plane?.rotation?.[1] ?? 0, tap);
      }}>
      <ViroNode ref={wrapper} scale={[pose.scale, pose.scale, pose.scale]} rotation={[0, pose.yaw, 0]}
        onPinch={(state, factor) => {
          const scale = clampScale(live.current.scale * factor);
          if (state === 3) commit({ ...live.current, scale });
          else if (state === 2) wrapper.current?.setNativeProps({ scale: [scale, scale, scale] });
        }}
        onRotate={(state, factor) => {
          const yaw = live.current.yaw - factor;
          if (state === 3) commit({ ...live.current, yaw });
          else if (state === 2) wrapper.current?.setNativeProps({ rotation: [0, yaw, 0] });
        }}>
        <TimeFoldContent />
      </ViroNode>
    </ViroARPlaneSelector>
  </ViroARScene>;
}
