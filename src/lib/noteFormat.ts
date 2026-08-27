// A hand-rolled parser for the minimal note syntax (PROMPTS.md Phase 11:
// "headings, bold and checkboxes... no rich text editor library"). No library
// needed — this is ~60 lines covering exactly three constructs, not a general
// markdown implementation; a real parser (marked, markdown-it) would cost tens
// of KB gzipped for features nothing here uses. Zero React imports.

export type NoteBlock =
  | { kind: 'blank' }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'checkbox'; checked: boolean; text: string; lineIndex: number }
  | { kind: 'paragraph'; text: string };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const CHECKBOX_RE = /^-\s*\[( |x|X)\]\s*(.*)$/;

/** Splits a note body into typed blocks, one per line. */
export function parseNoteBody(body: string): NoteBlock[] {
  return body.split('\n').map((line, lineIndex): NoteBlock => {
    if (line.trim() === '') return { kind: 'blank' };

    const heading = line.match(HEADING_RE);
    if (heading) return { kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] };

    const checkbox = line.match(CHECKBOX_RE);
    if (checkbox) {
      return { kind: 'checkbox', checked: checkbox[1].toLowerCase() === 'x', text: checkbox[2], lineIndex };
    }

    return { kind: 'paragraph', text: line };
  });
}

export interface InlineRun {
  bold: boolean;
  text: string;
}

/** Splits one line's text into plain/bold runs for **bold** rendering. */
export function parseInlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > lastIndex) runs.push({ bold: false, text: text.slice(lastIndex, match.index) });
    runs.push({ bold: true, text: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) runs.push({ bold: false, text: text.slice(lastIndex) });
  return runs;
}

/** Flips one checkbox line's checked state, returning the full updated body. */
export function toggleCheckboxLine(body: string, lineIndex: number): string {
  const lines = body.split('\n');
  const match = lines[lineIndex]?.match(/^(-\s*\[)( |x|X)(\]\s*.*)$/);
  if (!match) return body;
  lines[lineIndex] = `${match[1]}${match[2].toLowerCase() === 'x' ? ' ' : 'x'}${match[3]}`;
  return lines.join('\n');
}
