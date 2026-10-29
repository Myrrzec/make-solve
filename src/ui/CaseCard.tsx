import { formatMove, parseSequence } from '../cube/moveParser';
import type { Facelets } from '../cube/state';
import type { CubeMove } from '../cube/types';
import { explainMove } from '../guidance/instructions';
import type { CaseInfo } from '../solvers/types';
import { pieceArrows } from '../solvers/cfop/lastLayer';
import { LastLayerDiagram } from './LastLayerDiagram';

interface Props {
  info: CaseInfo;
  /** Cube as it should look right before the algorithm (top already turned). */
  facelets: Facelets;
  onShow?: () => void;
  /** Jump to a move of this step; the offset counts from the start of the step. */
  onSeek?: (offset: number) => void;
  /** Offset of the move to do now, when the playback is inside this step. */
  current?: number | null;
}

/** Named finger tricks that cubers say as one word. */
const TRIGGERS: { moves: string[]; name: string }[] = [
  { moves: ['R', 'U', "R'", "U'"], name: 'sexy move' },
  { moves: ["L'", "U'", 'L', 'U'], name: 'left sexy move' },
];

interface Chunk {
  moves: string[];
  trigger?: string;
}

/** Splits an algorithm into moves, grouping known triggers. */
export function chunkAlgorithm(algorithm: string): Chunk[] {
  const tokens = parseSequence(algorithm).map((m) => formatMove(m, 'r'));
  const out: Chunk[] = [];
  for (let i = 0; i < tokens.length; ) {
    const t = TRIGGERS.find((tr) => tr.moves.every((m, k) => tokens[i + k] === m));
    if (t) {
      out.push({ moves: t.moves, trigger: t.name });
      i += t.moves.length;
    } else {
      out.push({ moves: [tokens[i]] });
      i++;
    }
  }
  return out;
}

interface ChipProps {
  label: string;
  offset: number;
  length?: number;
  current?: number | null;
  onSeek?: (offset: number) => void;
  className?: string;
  children?: React.ReactNode;
}

/** A move (or a group of moves) that jumps the playback to itself when clicked. */
function MoveChip({ label, offset, length = 1, current, onSeek, className = 'move-chip', children }: ChipProps) {
  const active = current != null && current >= offset && current < offset + length;
  const done = current != null && current >= offset + length;
  return (
    <button
      type="button"
      className={`${className} seekable${active ? ' active' : ''}${done ? ' done' : ''}`}
      onClick={() => onSeek?.(offset)}
      disabled={!onSeek}
      title={`Jump to move ${label}`}
    >
      {children ?? label}
    </button>
  );
}

function TurnHint({ moves, label, offset, current, onSeek }: { moves: CubeMove[]; label: string; offset: number; current?: number | null; onSeek?: (o: number) => void }) {
  if (moves.length === 0) return null;
  const hint = explainMove(moves[0], 'beginner').relativeHint;
  return (
    <div className="case-step">
      <span className="case-step-label">{label}</span>
      <MoveChip label={formatMove(moves[0])} offset={offset} current={current} onSeek={onSeek} />
      <span className="small muted">{hint?.replace(/\.$/, '')}</span>
    </div>
  );
}

export function CaseCard({ info, facelets, onShow, onSeek, current }: Props) {
  const chunks = chunkAlgorithm(info.algorithm);
  const algStart = info.before.length;
  const algLength = chunks.reduce((n, c) => n + c.moves.length, 0);
  let at = algStart;
  const title = info.name ?? (info.set === 'PLL' && info.group ? info.group : `Case ${info.number}`);
  return (
    <article className={`card case ${info.set === 'OLL' ? 'case-oll' : 'case-pll'}`}>
      <header className="case-head">
        <span className="case-set">{info.set}</span>
        <h3>{capitalize(title)}</h3>
        <span className="case-num">
          №{info.number}
          {info.letter ? ` · ${info.letter}` : ''}
        </span>
      </header>
      <div className="case-body">
        <div className="case-diagram">
          <LastLayerDiagram
            facelets={facelets}
            mode={info.set}
            size={132}
            arrows={info.set === 'PLL' ? pieceArrows(facelets, info.algorithm) : undefined}
          />
        </div>
        <div className="case-info">
          {info.groupHint && <p className="case-hint">{info.groupHint}</p>}
          <TurnHint moves={info.before} label="First, top" offset={0} current={current} onSeek={onSeek} />
          <div className="case-alg-row">
            {chunks.map((c, i) => {
              const offset = at;
              at += c.moves.length;
              return c.trigger ? (
                <MoveChip key={i} label={c.moves.join(' ')} offset={offset} length={c.moves.length} current={current} onSeek={onSeek} className="trigger">
                  <span className="trigger-moves">{c.moves.join(' ')}</span>
                  <span className="trigger-name">{c.trigger}</span>
                </MoveChip>
              ) : (
                <MoveChip key={i} label={c.moves[0]} offset={offset} current={current} onSeek={onSeek} />
              );
            })}
          </div>
          <TurnHint moves={info.after} label="Finally, top" offset={algStart + algLength} current={current} onSeek={onSeek} />
          {info.sheetAlgorithm && (
            <p className="small muted">
              Sheet version: <span className="mono">{info.sheetAlgorithm}</span>
            </p>
          )}
        </div>
      </div>
      {onShow && (
        <footer className="case-foot">
          <button type="button" className="btn small" onClick={onShow}>
            Show in 3D
          </button>
        </footer>
      )}
    </article>
  );
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}
