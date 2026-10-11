export type Vec3 = readonly [number, number, number];

function normaliseDegrees(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d === 0 ? 0 : d;
}

export function faceCameraYaw(camera: Vec3, tap: Vec3, planeYawDeg = 0): number {
  const dx = camera[0] - tap[0];
  const dz = camera[2] - tap[2];
  const world = Math.hypot(dx, dz) < 1e-4 ? 0 : Math.atan2(dx, dz) * 180 / Math.PI;
  return normaliseDegrees(world - (Number.isFinite(planeYawDeg) ? planeYawDeg : 0));
}

export const SCALE_MIN = 0.22;
export const SCALE_MAX = 0.7;
export const SCALE_DEFAULT = 0.4;

export function clampScale(s: number): number {
  return Number.isFinite(s) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) : SCALE_DEFAULT;
}

export type TrackingHint = null | 'motion' | 'features' | 'unavailable';

export function trackingHint(state: number, reason: number): TrackingHint {
  if (state === 3) return null;
  if (state === 1) return 'unavailable';
  return reason === 2 ? 'motion' : reason === 3 ? 'features' : null;
}

export type AmbientLight = Readonly<{ intensity: number; color: string }>;
export const AMBIENT_DEFAULT: AmbientLight = { intensity: 300, color: '#ffffff' };

export function ambientFromEstimate(intensity: number, color: string): AmbientLight {
  return {
    intensity: Number.isFinite(intensity) ? Math.min(420, Math.max(180, intensity * 0.3)) : AMBIENT_DEFAULT.intensity,
    color: typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : AMBIENT_DEFAULT.color,
  };
}

export function lightChanged(prev: AmbientLight, next: AmbientLight): boolean {
  return Math.abs(prev.intensity - next.intensity) > 25 || prev.color.toLowerCase() !== next.color.toLowerCase();
}
