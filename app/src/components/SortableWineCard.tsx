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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  const blindLabel = `Wine ${String.fromCharCode(65 + index)}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center shrink-0 w-9">
          <span className="text-lg font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
            #{index + 1}
          </span>
          <svg className="w-5 h-5 text-charcoal-light/40 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <div className="flex-1">
          <WineCard wine={wine} blind={blind} blindLabel={blindLabel} />
        </div>
      </div>
    </div>
  );
};
