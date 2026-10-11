import { ViroAnimations, ViroMaterials } from '@reactvision/react-viro';

ViroMaterials.createMaterials({
  tfFloor: { diffuseColor: '#202b29' },
  tfWood: { diffuseColor: '#7a5c3e', lightingModel: 'Blinn', shininess: 18 },
  tfPast: { diffuseColor: '#a38f69' },
  tfPresent: { diffuseColor: '#596b62' },
  tfDusty: { diffuseColor: '#66685c', lightingModel: 'Blinn', shininess: 8 },
  tfFuture: { diffuseColor: '#839e8e' },
  tfBrass: { diffuseColor: '#c6a065', lightingModel: 'Blinn', shininess: 42 },
  tfCopper: { diffuseColor: '#b0663a', lightingModel: 'Blinn', shininess: 60 },
  tfStone: { diffuseColor: '#7f8278' },
  tfDark: { diffuseColor: '#182323' },
  tfScorch: { diffuseColor: '#14100e' },
  tfGlass: { diffuseColor: '#5e8995', lightingModel: 'Blinn', shininess: 90 },
  tfLight: { diffuseColor: '#e4c782', lightingModel: 'Constant' },
  tfSignal: { diffuseColor: '#8be0c4', lightingModel: 'Constant' },
  tfHazard: { diffuseColor: '#c96a52', lightingModel: 'Constant' },
  tfOvergrown: { diffuseColor: '#3d5a45' },
  tfPanel: { diffuseColor: '#0e1514', lightingModel: 'Constant', blendMode: 'Alpha', alpha: 0.82 },
  tfHit: { diffuseColor: '#ffffff', alpha: 0, writesToDepthBuffer: false },
});

ViroAnimations.registerAnimations({
  tfGearSpin: { properties: { rotateZ: '+=360' }, duration: 5000 },
  tfBeaconPulse: { properties: { scaleX: '+=0.5', scaleY: '+=0.5', scaleZ: '+=0.5' }, duration: 1200 },
  tfTargetPulse: { properties: { scaleX: '+=0.35', scaleY: '+=0.35', scaleZ: '+=0.35' }, duration: 900 },
  tfSignalBurst: { properties: { scaleX: '+=7', scaleY: '+=7', opacity: '-=1' }, duration: 2400 },
  tfSelectPulse: [
    { properties: { scaleX: 1.18, scaleY: 1.18, scaleZ: 1.18 }, duration: 420, easing: 'EaseInEaseOut' },
    { properties: { scaleX: 1, scaleY: 1, scaleZ: 1 }, duration: 420, easing: 'EaseInEaseOut' },
  ],
  tfStarTwinkle: [
    { properties: { scaleX: 1.3, scaleY: 1.3, scaleZ: 1.3, opacity: 1 }, duration: 700, easing: 'EaseInEaseOut' },
    { properties: { scaleX: 0.85, scaleY: 0.85, scaleZ: 0.85, opacity: 0.7 }, duration: 700, easing: 'EaseInEaseOut' },
  ],
  tfRippleTravel: [
    { properties: { positionX: '+=2.3', scaleX: '+=0.7', scaleZ: '+=0.7' }, duration: 900, easing: 'EaseInEaseOut' },
    { properties: { opacity: 0 }, duration: 220, easing: 'EaseOut' },
  ],
  tfArrive: { properties: { scaleX: 1, scaleY: 1, scaleZ: 1, positionY: 0 }, duration: 650, easing: 'EaseOut' },
  tfLabelIn: [
    { properties: { opacity: 0 }, duration: 1 },
    { properties: { opacity: 1 }, duration: 450, easing: 'EaseIn' },
  ],
  tfLabelInDim: [
    { properties: { opacity: 0 }, duration: 1 },
    { properties: { opacity: 0.8 }, duration: 450, easing: 'EaseIn' },
  ],
});
