import type { PuzzleField } from '../../../shared/puzzle';
import type { ClueId } from '../../../shared/timefold';

export type Point = [number, number, number];

export type Interaction = {
  selected: PuzzleField | null;
  highlights: readonly PuzzleField[];
  evidence: readonly ClueId[];
  onSelect: (field: PuzzleField) => void;
  onPlace: (index: number) => void;
  onInspect: (clue: ClueId) => void;
};
