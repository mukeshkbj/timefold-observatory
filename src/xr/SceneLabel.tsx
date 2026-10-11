import { ViroText } from '@reactvision/react-viro';
import type { ViroAnimation } from '@reactvision/react-viro/dist/components/Animation/ViroAnimations';

type Point = [number, number, number];
export default function SceneLabel({ text, position, width, height, color, size = 0.45, opacity, animation, onClick }: {
  text: string;
  position: Point;
  width: number;
  height: number;
  color: string;
  size?: number;
  opacity?: number;
  animation?: ViroAnimation;
  onClick?: () => void;
}) {
  return <ViroText onClick={onClick} text={text} position={position} width={width / size} height={height / size} scale={[size, size, size]} opacity={opacity}
    animation={animation}
    textClipMode="None" style={{ fontSize: 16, color, textAlign: 'center', textAlignVertical: 'center' }} />;
}
