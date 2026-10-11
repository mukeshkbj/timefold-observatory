import { ViroText } from '@reactvision/react-viro';

type Point = [number, number, number];
export default function SceneLabel({ text, position, width, height, color, size = 0.45, opacity, onClick }: {
  text: string;
  position: Point;
  width: number;
  height: number;
  color: string;
  size?: number;
  opacity?: number;
  onClick?: () => void;
}) {
  return <ViroText onClick={onClick} text={text} position={position} width={width / size} height={height / size} scale={[size, size, size]} opacity={opacity}
    textClipMode="None" style={{ fontSize: 16, color, textAlign: 'center', textAlignVertical: 'center' }} />;
}
