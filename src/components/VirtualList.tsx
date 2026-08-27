import { useState, type ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  maxHeight?: number;
  overscan?: number;
}

/**
 * Minimal fixed-height windowed rendering — no new dependency (CLAUDE.md §3
 * names none, and react-window/react-virtual would need approval). Only worth
 * reaching for past ~100 rows (PROMPTS.md Phase 8, #2); below that, callers
 * should just render everything — simpler, and fast enough at this app's
 * scale. Bounds itself to `maxHeight` and scrolls internally, rather than
 * requiring the whole page to be one giant virtualized viewport.
 */
export default function VirtualList<T>({
  items,
  itemHeight,
  getKey,
  renderItem,
  maxHeight = 400,
  overscan = 5,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(maxHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
  const visible = items.slice(startIndex, endIndex);

  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ maxHeight, overflowY: 'auto' }}
      className="relative"
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visible.map((item, i) => (
          <div
            key={getKey(item)}
            style={{
              position: 'absolute',
              top: (startIndex + i) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
