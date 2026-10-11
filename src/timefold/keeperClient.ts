import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';
import { parseKeeperRequest, type KeeperRequest } from '../../shared/keeper';
import { createKeeperClient, KeeperClientError, type KeeperTransport } from '../../shared/keeperClient';
import type { Game } from '../../shared/timefold';

function nativeTransport(): KeeperTransport | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith('sb_publishable_')) return null;
  let endpoint: URL;
  try { endpoint = new URL(url); } catch { return null; }
  if (endpoint.protocol !== 'https:') return null;
  const client = createClient(url, key, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return async (request, signal) => {
    const existing = await client.auth.getSession();
    if (existing.error || signal.aborted) throw new KeeperClientError('auth_unavailable');
    const session = existing.data.session ?? (await client.auth.signInAnonymously()).data.session;
    if (!session || signal.aborted) throw new KeeperClientError('auth_unavailable');
    const { data, error } = await client.functions.invoke('keeper', { body: request, signal });
    if (error) throw new KeeperClientError('offline');
    return data;
  };
}

export function createNativeKeeperClient(mode: 'authored' | 'live', currentRevision: () => number) {
  const ask = createKeeperClient({ mode, currentRevision, timeoutMs: 10000, transport: mode === 'live' ? nativeTransport() : null });
  return (game: Game, question: KeeperRequest['question'], hintLevel: KeeperRequest['hintLevel'], era: KeeperRequest['era']) => {
    const request = parseKeeperRequest({ schemaVersion: 2, requestId: randomUUID(), seed: game.scenario.seed, state: game.state, revision: game.revision, question, hintLevel, era });
    if (!request) throw new Error('Keeper request could not be constructed.');
    return ask(request);
  };
}
