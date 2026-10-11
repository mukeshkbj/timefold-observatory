import { exitVRScene, ViroARScene, ViroController, ViroNode } from '@reactvision/react-viro';
import QuestConsole from './QuestConsole';
import TimeFoldContent from './TimeFoldContent';
import { actions, useTimeFold } from './sessionStore';

export default function TimeFoldQuestScene() {
  const snap = useTimeFold();
  return <ViroARScene>
    <ViroController reticleVisibility controllerVisibility />
    <ViroNode position={[0, -0.5, -1.2]} scale={[0.6, 0.6, 0.6]}>
      <TimeFoldContent />
    </ViroNode>
    <QuestConsole snap={snap} actions={actions} onExit={exitVRScene} />
  </ViroARScene>;
}
