import { ViroParticleEmitter } from '@reactvision/react-viro';
import './materials';
import type { Point } from './types';

const image = { source: require('../../../assets/fx/particle.png'), height: 0.02, width: 0.02, bloomThreshold: 0.6 };

export function Sparks({ position, run }: { position: Point; run: boolean }) {
  return (
    <ViroParticleEmitter
      position={position} run={run} duration={800} loop={true} fixedToEmitter={true}
      image={{ ...image, height: 0.03, width: 0.03 }}
      spawnBehavior={{
        particleLifetime: [300, 700],
        emissionRatePerSecond: [0, 0],
        emissionBurst: { time: 0, min: 10, max: 16, cycles: 40, cooldownPeriod: 500 },
        maxParticles: 40,
        spawnVolume: { shape: 'sphere', params: [0.02], spawnOnSurface: false },
      }}
      particleAppearance={{
        opacity: { initialRange: [0.9, 1], factor: 'time', interpolation: [{ endValue: 0, interval: [0.8, 1] }] },
        scale: { initialRange: [[0.6, 0.6, 0.6], [1.2, 1.2, 1.2]], factor: 'time', interpolation: [{ endValue: [0.4, 0.4, 0.4], interval: [0, 1] }] },
        color: { initialRange: ['#ffcf7a'], factor: 'time', interpolation: [{ endValue: '#c94f35', interval: [0, 1] }] },
      }}
      particlePhysics={{ velocity: { initialRange: [[-0.25, 0.7, -0.25], [0.25, 1.4, 0.25]] }, acceleration: { initialRange: [[0, -2.2, 0], [0, -2.2, 0]] } }}
    />
  );
}

export function SmokeWisps({ position, run }: { position: Point; run: boolean }) {
  return (
    <ViroParticleEmitter
      position={position} run={run} duration={3000} loop={true} fixedToEmitter={true}
      image={{ ...image, height: 0.08, width: 0.08 }}
      spawnBehavior={{
        particleLifetime: [1600, 2600],
        emissionRatePerSecond: [2, 4],
        maxParticles: 30,
        spawnVolume: { shape: 'box', params: [0.08, 0.02, 0.08], spawnOnSurface: false },
      }}
      particleAppearance={{
        opacity: { initialRange: [0.25, 0.4], factor: 'time', interpolation: [{ endValue: 0, interval: [0.6, 1] }] },
        scale: { initialRange: [[0.4, 0.4, 0.4], [0.8, 0.8, 0.8]], factor: 'time', interpolation: [{ endValue: [2.4, 2.4, 2.4], interval: [0, 1] }] },
        color: { initialRange: ['#3a3f3c'], factor: 'time', interpolation: [{ endValue: '#232725', interval: [0, 1] }] },
      }}
      particlePhysics={{ velocity: { initialRange: [[-0.02, 0.12, -0.02], [0.02, 0.25, 0.02]] }, acceleration: { initialRange: [[0, 0.05, 0], [0, 0.05, 0]] } }}
    />
  );
}

export function DustMotes({ run }: { run: boolean }) {
  return (
    <ViroParticleEmitter
      position={[0, 0.25, 0.1]} run={run} duration={7000} loop={true} fixedToEmitter={true}
      image={{ ...image, height: 0.015, width: 0.015 }}
      spawnBehavior={{
        particleLifetime: [3500, 6000],
        emissionRatePerSecond: [1, 2],
        maxParticles: 24,
        spawnVolume: { shape: 'box', params: [0.6, 0.5, 0.6], spawnOnSurface: false },
      }}
      particleAppearance={{
        opacity: { initialRange: [0.1, 0.22], factor: 'time', interpolation: [{ endValue: 0, interval: [0.75, 1] }] },
        scale: { initialRange: [[0.5, 0.5, 0.5], [1, 1, 1]], factor: 'time', interpolation: [] },
        color: { initialRange: ['#b6c1b8'], factor: 'time', interpolation: [{ endValue: '#8a9a8e', interval: [0, 1] }] },
      }}
      particlePhysics={{ velocity: { initialRange: [[-0.015, 0.01, -0.015], [0.015, 0.04, 0.015]] } }}
    />
  );
}

export function SignalMotes({ position, run }: { position: Point; run: boolean }) {
  return (
    <ViroParticleEmitter
      position={position} run={run} duration={4000} loop={true} fixedToEmitter={true}
      image={{ ...image, height: 0.025, width: 0.025 }}
      spawnBehavior={{
        particleLifetime: [1800, 3000],
        emissionRatePerSecond: [5, 8],
        maxParticles: 45,
        spawnVolume: { shape: 'box', params: [0.12, 0.05, 0.12], spawnOnSurface: false },
      }}
      particleAppearance={{
        opacity: { initialRange: [0.5, 0.9], factor: 'time', interpolation: [{ endValue: 0, interval: [0.7, 1] }] },
        scale: { initialRange: [[0.5, 0.5, 0.5], [1, 1, 1]], factor: 'time', interpolation: [{ endValue: [0.3, 0.3, 0.3], interval: [0.8, 1] }] },
        color: { initialRange: ['#8be0c4'], factor: 'time', interpolation: [{ endValue: '#d7f5e8', interval: [0, 1] }] },
      }}
      particlePhysics={{ velocity: { initialRange: [[-0.02, 0.25, -0.02], [0.02, 0.5, 0.02]] }, acceleration: { initialRange: [[0, 0.15, 0], [0, 0.15, 0]] } }}
    />
  );
}

export function StarSparkle({ position, run }: { position: Point; run: boolean }) {
  return (
    <ViroParticleEmitter
      position={position} run={run} duration={2500} loop={true} fixedToEmitter={true}
      image={{ ...image, height: 0.02, width: 0.02 }}
      spawnBehavior={{
        particleLifetime: [900, 1600],
        emissionRatePerSecond: [2, 4],
        maxParticles: 18,
        spawnVolume: { shape: 'sphere', params: [0.09], spawnOnSurface: true },
      }}
      particleAppearance={{
        opacity: { initialRange: [0.5, 0.9], factor: 'time', interpolation: [{ endValue: 0, interval: [0.6, 1] }] },
        scale: { initialRange: [[0.4, 0.4, 0.4], [0.9, 0.9, 0.9]], factor: 'time', interpolation: [] },
        color: { initialRange: ['#e8fdf5'], factor: 'time', interpolation: [{ endValue: '#8be0c4', interval: [0, 1] }] },
      }}
      particlePhysics={{ velocity: { initialRange: [[-0.01, -0.01, -0.01], [0.01, 0.01, 0.01]] } }}
    />
  );
}
