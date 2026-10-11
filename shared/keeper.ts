import { z } from 'zod';
import { caseCount, deriveWorld, parseTimeFoldState, scenarioFromSeed, type Scenario, type TimeFoldState } from './timefold.ts';

type Fact = Readonly<{ text: string; highlights: readonly (keyof TimeFoldState)[] }>;
const facts = {
  'cell-observe': { text: 'Two sockets, one dead. The 2026 room still shows which one the motor ever drank from — inspect the exposed wiring.', highlights: ['cell'] },
  'cell-direct': { text: 'The wiring is the evidence: the cable from the motor runs to the socket that was always live. Trust the present, not the labels.', highlights: ['cell'] },
  'cell-place-a': { text: 'Set the power cell into Socket A on the 1986 bench.', highlights: ['cell'] },
  'cell-place-b': { text: 'Set the power cell into Socket B on the 1986 bench.', highlights: ['cell'] },
  'fuse-observe': { text: 'The protection path is broken. The bypass link tempts a shortcut; raw power without protection only burns the circuit.', highlights: ['fuse'] },
  'fuse-direct': { text: 'The protection socket waits beside the cell. The bypass link is not a repair — it is a hazard.', highlights: ['fuse'] },
  'fuse-place': { text: 'Seat the fuse in the protection socket — never in the bypass.', highlights: ['fuse'] },
  'gear-observe': { text: 'The motor has power, but nothing turns. The drive path is missing its gear.', highlights: ['gear'] },
  'gear-direct': { text: 'The drive socket is open on the bench.', highlights: ['gear'] },
  'gear-place': { text: 'Mount the drive gear into the motor drive socket.', highlights: ['gear'] },
  'lens-observe': { text: 'The telescope is blind. Its optical path is incomplete.', highlights: ['lens'] },
  'lens-direct': { text: 'A clear lens belongs in the optical mount.', highlights: ['lens'] },
  'lens-place': { text: 'Set the lens into the optical mount.', highlights: ['lens'] },
  'alignment-observe': { text: 'The instrument stares at the wrong sky. In 2086 the dome is gone — inspect the open sky and read where the signal star hangs.', highlights: ['alignment'] },
  'alignment-direct': { text: 'The star\'s bearing in the broken future sky is the bearing this telescope must hold in 1986.', highlights: ['alignment'] },
  'alignment-place-left': { text: 'Turn the alignment control until the telescope bears left.', highlights: ['alignment'] },
  'alignment-place-centre': { text: 'Turn the alignment control until the telescope bears centre.', highlights: ['alignment'] },
  'alignment-place-right': { text: 'Turn the alignment control until the telescope bears right.', highlights: ['alignment'] },
  'crystal-observe': { text: 'The receiver cannot hold what it hears. The crystal mount is empty.', highlights: ['crystal'] },
  'crystal-direct': { text: 'The crystal mount waits at the receiver.', highlights: ['crystal'] },
  'crystal-place': { text: 'Set the receiver crystal into its mount.', highlights: ['crystal'] },
  'frequency-observe': { text: 'The receiver listens on the wrong band. The 2086 ruin keeps the answer — inspect the etched plaque.', highlights: ['frequency'] },
  'frequency-direct': { text: 'The plaque names the band the signal survived on. Tune the receiver to match it.', highlights: ['frequency'] },
  'frequency-place-low': { text: 'Tune the receiver to the low band.', highlights: ['frequency'] },
  'frequency-place-mid': { text: 'Tune the receiver to the mid band.', highlights: ['frequency'] },
  'frequency-place-high': { text: 'Tune the receiver to the high band.', highlights: ['frequency'] },
  'explain-dark': { text: 'Nothing downstream exists until the past is fed: the cell and the protection fuse must both be seated before power reaches the motor.', highlights: ['cell', 'fuse'] },
  'explain-power': { text: 'Power now flows — the motor is awake. But light still has no path: drive gear, lens and alignment are incomplete.', highlights: ['cell', 'fuse', 'gear'] },
  'explain-sky': { text: 'The instrument can see — power, drive, lens and aim agree. What remains is a way to listen: the crystal and its frequency.', highlights: ['lens', 'crystal', 'frequency'] },
  'explain-signal': { text: 'Every link now holds. The chain carries the repaired past forward, and the future finally hears the signal.', highlights: ['crystal', 'frequency'] },
  'explain-hazard': { text: 'The bypass carries the cell\'s full load with no protection — a fault has nowhere to stop. That is how real systems fail too: one shortcut under load turns a small fault into a burnt circuit and an outage.', highlights: ['cell', 'fuse'] },
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
  schemaVersion: z.literal(2),
  requestId: z.uuid(),
  seed: z.number().int().min(0).max(caseCount - 1),
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

const observeDirect: Record<keyof TimeFoldState, readonly [FactId, FactId]> = {
  cell: ['cell-observe', 'cell-direct'],
  fuse: ['fuse-observe', 'fuse-direct'],
  gear: ['gear-observe', 'gear-direct'],
  lens: ['lens-observe', 'lens-direct'],
  alignment: ['alignment-observe', 'alignment-direct'],
  crystal: ['crystal-observe', 'crystal-direct'],
  frequency: ['frequency-observe', 'frequency-direct'],
};
function placeFact(field: keyof TimeFoldState, scenario: Scenario): FactId {
  switch (field) {
    case 'cell': return scenario.socket === 'a' ? 'cell-place-a' : 'cell-place-b';
    case 'alignment': return `alignment-place-${scenario.bearing}`;
    case 'frequency': return `frequency-place-${scenario.band}`;
    default: return `${field}-place`;
  }
}
const lore: Record<KeeperRequest['era'], FactId> = { past: 'lore-past', present: 'lore-present', future: 'lore-future' };

export function primaryFact(request: KeeperRequest): FactId {
  if (request.question === 'lore') return lore[request.era];
  const scenario = scenarioFromSeed(request.seed);
  const world = deriveWorld(request.state, scenario);
  if (request.question === 'explain') {
    return world.hazard ? 'explain-hazard'
      : world.signalRecovered ? 'explain-signal'
        : world.aimed ? 'explain-sky'
          : world.powered ? 'explain-power' : 'explain-dark';
  }
  const state = request.state;
  if (world.hazard) {
    return request.hintLevel === 1 ? 'fuse-observe' : request.hintLevel === 2 ? 'fuse-direct' : 'fuse-place';
  }
  const missing = state.cell !== scenario.socket ? 'cell' : state.fuse !== 'protected' ? 'fuse'
    : state.gear !== 'drive' ? 'gear' : state.lens !== 'optic' ? 'lens'
      : state.alignment !== scenario.bearing ? 'alignment' : state.crystal !== 'receiver' ? 'crystal'
        : state.frequency !== scenario.band ? 'frequency' : null;
  if (!missing) return 'complete';
  return request.hintLevel === 1 ? observeDirect[missing][0] : request.hintLevel === 2 ? observeDirect[missing][1] : placeFact(missing, scenario);
}

export function authoredReply(request: KeeperRequest, reason: FallbackReason): KeeperReply {
  return { mode: 'authored', factId: primaryFact(request), revision: request.revision, reason };
}

export function parseKeeperReply(value: unknown, request: KeeperRequest): KeeperReply | null {
  const parsed = keeperReplySchema.safeParse(value);
  if (!parsed.success || parsed.data.revision !== request.revision || parsed.data.factId !== primaryFact(request)) return null;
  return parsed.data;
}
