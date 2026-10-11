import { z } from 'zod';
import { deriveWorld, parseTimeFoldState, type TimeFoldState } from './timefold.ts';

type Fact = Readonly<{ text: string; highlights: readonly (keyof TimeFoldState)[] }>;
const facts = {
  'cell-observe': { text: 'The main socket sits empty. Nothing downstream can wake until the past is fed.', highlights: ['cell'] },
  'cell-direct': { text: 'The cell belongs in the main socket. The spare socket was abandoned for a reason.', highlights: ['cell'] },
  'cell-place': { text: 'Set the power cell into the main socket on the 1986 bench.', highlights: ['cell'] },
  'fuse-observe': { text: 'The protection path is broken. Raw power without it only burns the circuit.', highlights: ['fuse'] },
  'fuse-direct': { text: 'The protection socket waits beside the main cell.', highlights: ['fuse'] },
  'fuse-place': { text: 'Seat the fuse in the protection socket — never in the bypass.', highlights: ['fuse'] },
  'gear-observe': { text: 'The motor has power, but nothing turns. The drive path is missing its gear.', highlights: ['gear'] },
  'gear-direct': { text: 'The drive socket is open on the bench.', highlights: ['gear'] },
  'gear-place': { text: 'Mount the drive gear into the motor drive socket.', highlights: ['gear'] },
  'lens-observe': { text: 'The telescope is blind. Its optical path is incomplete.', highlights: ['lens'] },
  'lens-direct': { text: 'A clear lens belongs in the optical mount.', highlights: ['lens'] },
  'lens-place': { text: 'Set the lens into the optical mount.', highlights: ['lens'] },
  'alignment-observe': { text: 'The instrument looks at the wrong sky. The signal star is off-axis.', highlights: ['alignment'] },
  'alignment-direct': { text: 'The alignment dial can be turned toward the marked star.', highlights: ['alignment'] },
  'alignment-place': { text: 'Turn the alignment control to its marked target.', highlights: ['alignment'] },
  'crystal-observe': { text: 'The receiver cannot hold what it hears. The crystal mount is empty.', highlights: ['crystal'] },
  'crystal-direct': { text: 'The crystal mount waits at the receiver.', highlights: ['crystal'] },
  'crystal-place': { text: 'Set the receiver crystal into its mount.', highlights: ['crystal'] },
  'frequency-observe': { text: 'The receiver listens on the wrong band. The signal passes it unheard.', highlights: ['frequency'] },
  'frequency-direct': { text: 'The tuning control marks the frequency to find.', highlights: ['frequency'] },
  'frequency-place': { text: 'Tune the receiver to the marked frequency.', highlights: ['frequency'] },
  'explain-dark': { text: 'Nothing downstream exists until the past is fed: the cell and the protection fuse must both be seated before power reaches the motor.', highlights: ['cell', 'fuse'] },
  'explain-power': { text: 'Power now flows — the motor is awake. But light still has no path: drive gear, lens and alignment are incomplete.', highlights: ['cell', 'fuse', 'gear'] },
  'explain-sky': { text: 'The instrument can see — power, drive, lens and aim agree. What remains is a way to listen: the crystal and its frequency.', highlights: ['lens', 'crystal', 'frequency'] },
  'explain-signal': { text: 'Every link now holds. The chain carries the repaired past forward, and the future finally hears the signal.', highlights: ['crystal', 'frequency'] },
  'lore-past': { text: 'The first keepers built this place to listen beyond their own lifetimes. Every repair you make is a promise to someone who has not yet arrived.', highlights: [] },
  'lore-present': { text: 'The room is quiet, but it remembers the shape of its working. Silence is a state, not an ending.', highlights: [] },
  'lore-future': { text: 'A keeper you will never meet inherits what survives here. This is the fictional observatory\'s possible future — not a prediction of ours.', highlights: [] },
  complete: { text: 'The lost signal has returned. Trace the chain back, or undo a repair and watch which futures depend on it.', highlights: ['crystal', 'frequency'] },
} satisfies Record<string, Fact>;

export type FactId = keyof typeof facts;
export const getFact = (id: FactId): Fact => facts[id];
export const isFactId = (value: unknown): value is FactId => typeof value === 'string' && Object.hasOwn(facts, value);
const factIdSchema = z.custom<FactId>(isFactId);
const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const stateSchema = z.unknown().transform((value, context) => {
  const state = parseTimeFoldState(value);
  if (state) return state;
  context.addIssue({ code: 'custom', message: 'Invalid TimeFold arrangement.' });
  return z.NEVER;
});

export const keeperRequestSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  state: stateSchema,
  revision: revisionSchema,
  question: z.enum(['hint', 'explain', 'lore']),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  era: z.enum(['past', 'present', 'future']),
}).strict();
export type KeeperRequest = z.infer<typeof keeperRequestSchema>;

export const fallbackReasonSchema = z.enum([
  'offline', 'not_configured', 'disabled', 'timeout', 'quota', 'busy',
  'provider_error', 'invalid_reply', 'auth_unavailable',
]);
export const liveKeeperReplySchema = z.object({ mode: z.literal('live'), factId: factIdSchema, revision: revisionSchema, narration: z.string().trim().min(1).max(600) }).strict();
export const keeperReplySchema = z.discriminatedUnion('mode', [
  liveKeeperReplySchema,
  z.object({ mode: z.literal('authored'), factId: factIdSchema, revision: revisionSchema, reason: fallbackReasonSchema }).strict(),
]);
export type KeeperReply = z.infer<typeof keeperReplySchema>;
export type FallbackReason = Extract<KeeperReply, { mode: 'authored' }>['reason'];

export const keeperErrorSchema = z.object({ error: z.enum([
  'unauthorized', 'auth_unavailable', 'invalid_request', 'too_large',
  'method_not_allowed', 'origin_not_allowed', 'quota_store_unavailable',
  'request_conflict', 'configuration_unavailable',
]) }).strict();
export type KeeperError = z.infer<typeof keeperErrorSchema>;

export function parseKeeperRequest(value: unknown): KeeperRequest | null {
  const parsed = keeperRequestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const repairHints: Record<keyof TimeFoldState, readonly [FactId, FactId, FactId]> = {
  cell: ['cell-observe', 'cell-direct', 'cell-place'],
  fuse: ['fuse-observe', 'fuse-direct', 'fuse-place'],
  gear: ['gear-observe', 'gear-direct', 'gear-place'],
  lens: ['lens-observe', 'lens-direct', 'lens-place'],
  alignment: ['alignment-observe', 'alignment-direct', 'alignment-place'],
  crystal: ['crystal-observe', 'crystal-direct', 'crystal-place'],
  frequency: ['frequency-observe', 'frequency-direct', 'frequency-place'],
};
const lore: Record<KeeperRequest['era'], FactId> = { past: 'lore-past', present: 'lore-present', future: 'lore-future' };

export function primaryFact(request: KeeperRequest): FactId {
  if (request.question === 'lore') return lore[request.era];
  const world = deriveWorld(request.state);
  if (request.question === 'explain') {
    return world.signalRecovered ? 'explain-signal' : world.aimed ? 'explain-sky' : world.powered ? 'explain-power' : 'explain-dark';
  }
  const state = request.state;
  const missing = state.cell !== 'main' ? 'cell' : state.fuse !== 'protected' ? 'fuse'
    : state.gear !== 'drive' ? 'gear' : state.lens !== 'optic' ? 'lens'
      : state.alignment !== 'target' ? 'alignment' : state.crystal !== 'receiver' ? 'crystal'
        : state.frequency !== 'target' ? 'frequency' : null;
  return missing ? repairHints[missing][request.hintLevel - 1] : 'complete';
}

export function authoredReply(request: KeeperRequest, reason: FallbackReason): KeeperReply {
  return { mode: 'authored', factId: primaryFact(request), revision: request.revision, reason };
}

export function parseKeeperReply(value: unknown, request: KeeperRequest): KeeperReply | null {
  const parsed = keeperReplySchema.safeParse(value);
  if (!parsed.success || parsed.data.revision !== request.revision || parsed.data.factId !== primaryFact(request)) return null;
  return parsed.data;
}
