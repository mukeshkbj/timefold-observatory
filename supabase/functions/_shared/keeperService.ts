import { authoredReply, parseKeeperReply, parseKeeperRequest, type KeeperError, type KeeperReply, type KeeperRequest } from '../../../shared/keeper.ts';

export type Reservation =
  | { kind: 'new' }
  | { kind: 'cached'; reply: unknown }
  | { kind: 'pending' }
  | { kind: 'conflict' }
  | { kind: 'denied' };
export type QuotaStore = {
  reserve: (userId: string, requestId: string, fingerprint: string) => Promise<Reservation>;
  complete: (userId: string, requestId: string, fingerprint: string, reply: KeeperReply) => Promise<void>;
};
export type KeeperDependencies = {
  enabled: boolean;
  authenticate: (token: string) => Promise<string | null>;
  quota: QuotaStore;
  generate: (request: KeeperRequest, signal: AbortSignal) => Promise<unknown>;
  allowedOrigins: readonly string[];
  timeoutMs: number;
};

export async function readBoundedJson(request: Request | Response, maximum: number): Promise<{ ok: true; value: unknown } | { ok: false; reason: 'too_large' | 'invalid_json' }> {
  if (Number(request.headers.get('content-length')) > maximum) return { ok: false, reason: 'too_large' };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, reason: 'invalid_json' };
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > maximum) { await reader.cancel(); return { ok: false, reason: 'too_large' }; }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return { ok: true, value };
  } catch { return { ok: false, reason: 'invalid_json' }; }
}

export async function requestFingerprint(request: KeeperRequest): Promise<string> {
  const data = JSON.stringify({ schemaVersion: request.schemaVersion, seed: request.seed, state: request.state, revision: request.revision, question: request.question, hintLevel: request.hintLevel, era: request.era });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateReply(dependencies: KeeperDependencies, request: KeeperRequest): Promise<KeeperReply> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Keeper deadline elapsed.')); }, dependencies.timeoutMs);
  });
  try {
    const value = await Promise.race([dependencies.generate(request, controller.signal), deadline]);
    return parseKeeperReply(value, request) ?? authoredReply(request, 'invalid_reply');
  } catch {
    return authoredReply(request, controller.signal.aborted ? 'timeout' : 'provider_error');
  } finally { clearTimeout(timer); }
}

export function createKeeperHandler(dependencies: KeeperDependencies) {
  if (!Number.isInteger(dependencies.timeoutMs) || dependencies.timeoutMs < 1 || dependencies.timeoutMs > 8000) {
    throw new Error('Keeper deadline must be an integer between 1 and 8000 milliseconds.');
  }
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    const error = (code: KeeperError['error'], status: number) => Response.json({ error: code }, { status, headers });
    if (origin && !dependencies.allowedOrigins.includes(origin)) return error('origin_not_allowed', 403);
    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type';
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers.Vary = 'Origin';
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return error('method_not_allowed', 405);
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]{1,4096})$/i)?.[1];
    if (!token) return error('unauthorized', 401);
    const body = await readBoundedJson(request, 8192);
    if (!body.ok) return error(body.reason === 'too_large' ? 'too_large' : 'invalid_request', body.reason === 'too_large' ? 413 : 400);
    const input = parseKeeperRequest(body.value);
    if (!input) return error('invalid_request', 400);
    let userId: string | null;
    try { userId = await dependencies.authenticate(token); } catch { return error('auth_unavailable', 503); }
    if (!userId) return error('unauthorized', 401);
    const respond = (reply: KeeperReply) => Response.json(reply, { headers });
    if (!dependencies.enabled) return respond(authoredReply(input, 'disabled'));
    const fingerprint = await requestFingerprint(input);
    let reservation: Reservation;
    try { reservation = await dependencies.quota.reserve(userId, input.requestId, fingerprint); } catch { return error('quota_store_unavailable', 503); }
    if (reservation.kind === 'conflict') return error('request_conflict', 409);
    if (reservation.kind === 'denied') return respond(authoredReply(input, 'quota'));
    if (reservation.kind === 'pending') return respond(authoredReply(input, 'busy'));
    if (reservation.kind === 'cached') return respond(parseKeeperReply(reservation.reply, input) ?? authoredReply(input, 'invalid_reply'));
    const reply = await generateReply(dependencies, input);
    try { await dependencies.quota.complete(userId, input.requestId, fingerprint, reply); } catch { return error('quota_store_unavailable', 503); }
    return respond(reply);
  };
}
