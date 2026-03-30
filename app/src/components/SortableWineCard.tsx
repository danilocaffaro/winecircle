import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Wine } from '../types';
import { WineCard } from './WineCard';

interface Props {
  wine: Wine;
  index: number;
  blind: boolean;
}

export const SortableWineCard: React.FC<Props> = ({ wine, index, blind }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wine.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  const blindLabel = `Wine ${String.fromCharCode(65 + index)}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 36 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--md3-primary)', fontFamily: 'Playfair Display, serif' }}>
            #{index + 1}
          </span>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--md3-on-surface-variant)', marginTop: 4 }}>
            drag_indicator
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <WineCard wine={wine} blind={blind} blindLabel={blindLabel} />
        </div>
      </div>
    </div>
  );
};
