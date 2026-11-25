import type { FigureCell, FigureVisual } from '../models/question';

/**
 * Pure SVG renderer for figural items. Shapes are drawn into a 100×100 box;
 * multiples are laid out in fixed slots so "count" is unambiguous.
 */
const SLOTS: Record<1 | 2 | 3, [number, number, number][]> = {
  1: [[50, 50, 30]],
  2: [[30, 50, 17], [70, 50, 17]],
  3: [[50, 28, 15], [28, 68, 15], [72, 68, 15]],
};

function shapePath(shape: FigureCell['shape'], cx: number, cy: number, r: number): string {
  switch (shape) {
    case 'circle':
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
    case 'square':
      return `M ${cx - r} ${cy - r} h ${2 * r} v ${2 * r} h ${-2 * r} Z`;
    case 'triangle':
      return `M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.85} L ${cx - r} ${cy + r * 0.85} Z`;
    case 'diamond':
      return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
      });
      return `M ${pts.join(' L ')} Z`;
    }
  }
}

export function FigureSvg({ cell, uid }: { cell: FigureCell; uid: string }) {
  const patternId = `stripes-${uid}`;
  const fill = cell.fill === 'full' ? 'currentColor' : cell.fill === 'striped' ? `url(#${patternId})` : 'none';
  const dot = cell.dotAngle !== undefined
    ? (() => {
        // 0° = 12 o'clock, clockwise
        const rad = ((cell.dotAngle - 90) * Math.PI) / 180;
        return { x: 50 + 44 * Math.cos(rad), y: 50 + 44 * Math.sin(rad) };
      })()
    : null;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="צורה">
      <defs>
        <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="2.2" />
        </pattern>
      </defs>
      {SLOTS[cell.count].map(([cx, cy, r], i) => (
        <path key={i} d={shapePath(cell.shape, cx, cy, r)} fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      ))}
      {dot && <circle cx={dot.x} cy={dot.y} r="5" fill="var(--accent, #c9972c)" />}
    </svg>
  );
}

export function FigureBoard({ visual, qid }: { visual: FigureVisual; qid: string }) {
  return (
    <div className={visual.layout === 'matrix' ? 'matrix' : 'series'}>
      {visual.cells.map((c, i) =>
        c ? (
          <div className="fig-cell" key={i}>
            <FigureSvg cell={c} uid={`${qid}-b${i}`} />
          </div>
        ) : (
          <div className="fig-cell missing" key={i}>?</div>
        ),
      )}
    </div>
  );
}
