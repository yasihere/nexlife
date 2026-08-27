import { useEffect, useState, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Generic bottom sheet: backdrop dismiss, safe-area padding, slides up on open.
 * The global `prefers-reduced-motion` rule in tokens.css collapses the transition
 * duration to ~0, so under reduced motion this simply appears — no separate branch
 * needed here (CLAUDE.md §5: "sheets appear without sliding").
 */
export default function Sheet({ open, onClose, children }: SheetProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    // Mount closed, then flip on the next frame so the transform transition runs.
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-void/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={
          'relative z-10 w-full max-w-[430px] rounded-t bg-panel shadow-[0_-8px_24px_rgba(0,0,0,0.35)] ' +
          'transition-transform duration-200 ease-out ' +
          (entered ? 'translate-y-0' : 'translate-y-full')
        }
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </div>
  );
}
