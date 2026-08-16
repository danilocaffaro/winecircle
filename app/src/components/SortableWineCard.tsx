import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Wine } from '../types';
import { WineCard } from './WineCard';
import { blindLabel } from '../utils/algorithms';

interface Props {
  wine: Wine;
  /** Índice original no evento — define o rótulo cego, que não muda ao arrastar. */
  wineIndex: number;
  /** Posição atual no ranking (0 = favorito). Só isso muda ao reordenar. */
  position: number;
  total: number;
  blind: boolean;
  onMove: (from: number, to: number) => void;
}

export const SortableWineCard: React.FC<Props> = ({
  wine, wineIndex, position, total, blind, onMove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: wine.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  const label = blind ? blindLabel(wineIndex) : wine.name;
  const isFirst = position === 0;
  const isLast = position === total - 1;

  const arrowStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 28, padding: 0, border: 'none', background: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.25 : 1,
    color: 'var(--md-on-surface-variant)',
  });

  return (
    <div ref={setNodeRef} style={style} data-testid={`rank-item-${wineIndex}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Controles explícitos: arrastar não pode ser o único jeito de ranquear.
            Serve para teclado, leitor de tela e para quem tem dificuldade
            motora — e continua valendo para quem prefere arrastar. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          flexShrink: 0, width: 32,
        }}>
          <button type="button" disabled={isFirst} style={arrowStyle(isFirst)}
            data-testid={`move-up-${wineIndex}`}
            aria-label={`Subir ${label} para a posição ${position}`}
            onClick={() => onMove(position, position - 1)}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20 }}>
              keyboard_arrow_up
            </span>
          </button>

          <span style={{
            fontSize: 15, fontWeight: 700, color: 'var(--md-primary)',
            fontFamily: 'Playfair Display, serif', lineHeight: 1,
          }} data-testid={`position-${wineIndex}`}>
            {position + 1}
          </span>

          <button type="button" disabled={isLast} style={arrowStyle(isLast)}
            data-testid={`move-down-${wineIndex}`}
            aria-label={`Descer ${label} para a posição ${position + 2}`}
            onClick={() => onMove(position, position + 1)}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20 }}>
              keyboard_arrow_down
            </span>
          </button>
        </div>

        {/* Área de arraste */}
        <div {...attributes} {...listeners}
          aria-label={`${label}, posição ${position + 1} de ${total}. Arraste para reordenar.`}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{
            fontSize: 18, color: 'var(--md-outline)', flexShrink: 0,
          }}>drag_indicator</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <WineCard wine={wine} blind={blind} blindLabel={blindLabel(wineIndex)} />
          </div>
        </div>
      </div>
    </div>
  );
};
