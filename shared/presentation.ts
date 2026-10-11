import { deriveWorld, type ClueId, type Scenario, type TimeFoldState } from './timefold.ts';

export type EraVisual = Readonly<{
  era: 'past' | 'present' | 'future';
  label: string;
  year: string;
  x: number;
  state: TimeFoldState;
  scenario: Scenario;
  powered: boolean;
  hazard: boolean;
  aimed: boolean;
  signalRecovered: boolean;
  clues: readonly ClueId[];
  status: string;
}>;

export function buildEraVisuals(state: TimeFoldState, scenario: Scenario): readonly [EraVisual, EraVisual, EraVisual] {
  const world = deriveWorld(state, scenario);
  const base = { state, scenario, ...world };
  return [
    { ...base, era: 'past', label: 'PAST / EDITABLE', year: '1986', x: -1.15, clues: [], status: 'Every repair begins here' },
    {
      ...base, era: 'present', label: 'PRESENT / DERIVED', year: '2026', x: 0, clues: ['wiring'],
      status: world.hazard ? 'Circuit burnt — bypass' : world.aimed ? 'Instrument aligned' : world.powered ? 'Motor energized' : 'Mechanism silent',
    },
    {
      ...base, era: 'future', label: 'FUTURE / DERIVED', year: '2086', x: 1.15, clues: ['sky', 'plaque'],
      status: world.signalRecovered ? 'Lost signal recovered' : world.hazard ? 'Beacon dark — circuit burnt' : world.powered ? 'Beacon illuminated' : 'A future waiting for light',
    },
  ];
}
