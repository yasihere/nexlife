import { Fragment } from 'react';
import { parseNoteBody, parseInlineRuns } from '../lib/noteFormat';

interface NoteBodyProps {
  body: string;
  /** Omit to render read-only (no interactive checkboxes). */
  onToggleCheckbox?: (lineIndex: number) => void;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInlineRuns(text).map((run, i) => (
        <Fragment key={i}>{run.bold ? <strong>{run.text}</strong> : run.text}</Fragment>
      ))}
    </>
  );
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-heading',
  2: 'text-title font-semibold',
  3: 'text-title font-medium',
};

/** Renders the minimal note syntax — headings, **bold**, and tappable
 *  checkboxes (PROMPTS.md Phase 11). Completion reads the same as everywhere
 *  else in the app: opacity + strikethrough, never colour. */
export default function NoteBody({ body, onToggleCheckbox }: NoteBodyProps) {
  const blocks = parseNoteBody(body);

  return (
    <div className="flex flex-col gap-1">
      {blocks.map((block, i) => {
        if (block.kind === 'blank') return <div key={i} className="h-2" />;

        if (block.kind === 'heading') {
          return (
            <p key={i} className={`${HEADING_CLASS[block.level]} text-paper`}>
              <Inline text={block.text} />
            </p>
          );
        }

        if (block.kind === 'checkbox') {
          return (
            <label
              key={i}
              className="flex min-h-[44px] items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={block.checked}
                onChange={() => onToggleCheckbox?.(block.lineIndex)}
                disabled={!onToggleCheckbox}
                className="h-5 w-5 shrink-0"
                style={{ accentColor: 'var(--rule)' }}
              />
              <span
                className="text-title text-paper"
                style={{
                  textDecoration: block.checked ? 'line-through' : 'none',
                  opacity: block.checked ? 0.35 : 1,
                }}
              >
                <Inline text={block.text} />
              </span>
            </label>
          );
        }

        return (
          <p key={i} className="text-title text-paper">
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
