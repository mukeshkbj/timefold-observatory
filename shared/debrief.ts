import { caseLabel } from './puzzle.ts';
import { deriveWorld, type Game, type Scenario } from './timefold.ts';

export type Debrief = Readonly<{
  caseLabel: string;
  moves: number;
  misfires: number;
  hazards: number;
  undos: number;
  evidenceFound: number;
  evidenceTotal: 3;
  evidenceFirst: number;
  rating: 'Root-cause investigator' | 'Methodical engineer' | 'Trial and error' | 'Learned the hard way';
  lesson: string;
  chain: readonly string[];
}>;

const lessons: Readonly<Record<Debrief['rating'], string>> = {
  'Root-cause investigator': 'You read the effects before touching the cause — the core habit of fault isolation.',
  'Methodical engineer': 'You worked the chain link by link; when something was uncertain you tested it instead of guessing.',
  'Trial and error': 'You found the fix by trying destinations. The evidence was always there — read the derived eras before the next repair.',
  'Learned the hard way': 'You bridged a protection device under load. In real systems that is how one fault becomes an outage.',
};

const socketText: Readonly<Record<Scenario['socket'], string>> = { a: 'Socket A', b: 'Socket B' };
const bearingText: Readonly<Record<Scenario['bearing'], string>> = { left: 'Left', centre: 'Centre', right: 'Right' };
const bandText: Readonly<Record<Scenario['band'], string>> = { low: 'Low band', mid: 'Mid band', high: 'High band' };

function buildChain(game: Game): readonly string[] {
  const { state, scenario } = game;
  const world = deriveWorld(state, scenario);
  const links: readonly { done: string; broken: string; ok: boolean }[] = [
    { done: `1986 · Cell → ${socketText[scenario.socket]}`, broken: `Cell is not seated in ${socketText[scenario.socket]}`, ok: state.cell === scenario.socket },
    { done: '1986 · Fuse → Protection socket', broken: state.fuse === 'bypass' ? 'Fuse sits in the bypass — the circuit burnt' : 'Fuse is not protecting the circuit', ok: state.fuse === 'protected' },
    { done: '2026 · Motor energised', broken: 'Motor never energised', ok: world.powered },
    { done: '1986 · Gear → Drive socket', broken: 'Gear is not in the drive socket', ok: state.gear === 'drive' },
    { done: '1986 · Lens → Optical mount', broken: 'Lens is not in the optical mount', ok: state.lens === 'optic' },
    { done: `1986 · Telescope → ${bearingText[scenario.bearing]}`, broken: `Telescope is not bearing ${bearingText[scenario.bearing]}`, ok: state.alignment === scenario.bearing },
    { done: '2026 · Instrument aligned', broken: 'Instrument never aligned', ok: world.aimed },
    { done: '1986 · Crystal → Receiver mount', broken: 'Crystal is not in the receiver mount', ok: state.crystal === 'receiver' },
    { done: `1986 · Receiver → ${bandText[scenario.band]}`, broken: `Receiver is not tuned to ${bandText[scenario.band]}`, ok: state.frequency === scenario.band },
    { done: '2086 · Signal recovered', broken: 'Signal never recovered', ok: world.signalRecovered },
  ];
  const chain: string[] = [];
  for (const link of links) {
    if (!link.ok) { chain.push(`✕ ${link.broken}`); return chain; }
    chain.push(link.done);
  }
  return chain;
}

export function buildDebrief(game: Game): Debrief {
  const rating: Debrief['rating'] = game.stats.hazards > 0 ? 'Learned the hard way'
    : game.stats.misfires === 0 && game.evidence.length === 3 ? 'Root-cause investigator'
      : game.stats.misfires <= 2 ? 'Methodical engineer'
        : 'Trial and error';
  return {
    caseLabel: caseLabel(game.scenario),
    moves: game.stats.moves,
    misfires: game.stats.misfires,
    hazards: game.stats.hazards,
    undos: game.stats.undos,
    evidenceFound: game.evidence.length,
    evidenceTotal: 3,
    evidenceFirst: game.stats.evidenceFirst,
    rating,
    lesson: lessons[rating],
    chain: buildChain(game),
  };
}
