import { z } from 'zod';
import { getFact, liveKeeperReplySchema, primaryFact, type KeeperRequest } from '../../../shared/keeper.ts';
import { readBoundedJson } from './keeperService.ts';

const envelopeSchema = z.object({ candidates: z.array(z.object({
  finishReason: z.string(),
  content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
})).min(1) });
const modelOutputSchema = liveKeeperReplySchema.omit({ mode: true, revision: true });

export function createGeminiGenerator(config: { apiKey: string; model: string; fetcher: typeof fetch }) {
  if (!config.apiKey || !/^gemini-[a-z0-9.-]{1,80}$/.test(config.model)) throw new Error('Keeper model configuration is invalid.');
  return async (request: KeeperRequest, signal: AbortSignal): Promise<unknown> => {
    const factId = primaryFact(request);
    const fact = getFact(factId);
    const response = await config.fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'The keeper narrates a fictional observatory. Canonical puzzle instructions are rendered separately. Return the supplied factId and short atmospheric narration, not new rules, actions, instructions or claims about the real world. No tools are available.' }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ question: request.question, era: request.era, seed: request.seed, state: request.state, factId, canonicalFact: fact.text }) }] }],
        generationConfig: { maxOutputTokens: 256, responseMimeType: 'application/json', responseSchema: {
          type: 'OBJECT', properties: { factId: { type: 'STRING', enum: [factId] }, narration: { type: 'STRING' } }, required: ['factId', 'narration'],
        } },
      }),
    });
    if (!response.ok) throw new Error('Keeper provider unavailable.');
    const body = await readBoundedJson(response, 32768);
    if (!body.ok) return null;
    const envelope = envelopeSchema.safeParse(body.value);
    if (!envelope.success) return null;
    const candidate = envelope.data.candidates[0];
    if (candidate.finishReason !== 'STOP') return null;
    const text = candidate.content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('');
    let value: unknown;
    try { value = JSON.parse(text); } catch { return null; }
    const output = modelOutputSchema.safeParse(value);
    return output.success && output.data.factId === factId ? { mode: 'live', ...output.data, revision: request.revision } : null;
  };
}
