// Natural-language quick-add grammar (SPEC.md / PROMPTS.md Phase 5, extended by
// Phase 10 for logs). Zero React imports. chrono-node is loaded via dynamic
// import() only (CLAUDE.md §3) so it never enters the main bundle — only
// opening the quick-add sheet pulls it in.

import { dayKey as toDayKey } from '../lib/time';

export interface ParsedQuickAdd {
  type: 'task' | 'log';
  title: string;
  tags: string[];
  priority: 0 | 1 | 2 | 3;
  estimateMin?: number;
  energy?: 'low' | 'med' | 'high';
  dayKey?: string;
  startMin?: number;
  /** type: 'log' only — a timestamped number with a unit (PROMPTS.md Phase 10). */
  amount?: number;
  unit?: string;
  /**
   * Set when a date/time phrase was found but too ambiguous to apply safely.
   * `dayKey`/`startMin` stay unset and the full (token-stripped) text stays in
   * `title` — "ambiguity is never silently guessed" (PROMPTS.md Phase 5, #3).
   */
  dateHint?: string;
}

const TAG_RE = /#([a-zA-Z0-9_-]+)/g;
const PRIORITY_RE = /!(low|med|high)\b/gi;
const ENERGY_RE = /@(low|med|high)\b/gi;
// ~30m | ~1h | ~1h30 | ~1h30m — an hour part with optional minutes, or minutes alone.
const ESTIMATE_RE = /~(?:(\d+)h(\d+)?m?|(\d+)m)/gi;

const PRIORITY_VALUE: Record<string, 0 | 1 | 2 | 3> = { low: 1, med: 2, high: 3 };

// Longest-first within any shared prefix (hrs/hr/h) — regex alternation is
// first-match, not longest-match, so 'hr' before 'hrs' would wrongly leave a
// trailing "s" in the title.
const UNIT_SUFFIX_RE = /\b(\d+(?:\.\d+)?)(kg|steps|ml|l|hrs|hr|h)\b/i;

// Money now requires an explicit currency marker (₹ / Rs, either side of the
// number). Originally a *bare* leading number ("500 groceries") was enough —
// but that's indistinguishable from any quantity-first task title ("10
// pushups", "3 loads of laundry"), which silently became a money log with the
// quantity stripped into `amount` and the activity left as `title`. That's
// exactly the kind of silent guess PROMPTS.md's Phase 5 rule #3 rules out for
// dates ("ambiguity is never silently guessed") — it just wasn't applied here
// when Phase 10 added logs. Fixed per explicit product decision: a plain
// number alone is always part of a task title now.
const CURRENCY_PREFIX_RE = /(?:₹|rs\.?)\s*(\d+(?:\.\d+)?)\b/i;
const CURRENCY_SUFFIX_RE = /\b(\d+(?:\.\d+)?)\s*rs\b/i;

// Same canonical unit set SPEC.md's Entry.unit comment already declared
// ('INR' | 'kg' | 'steps' | 'ml' | 'hrs') — l/L collapse into ml (×1000) and
// h/hr collapse into hrs, rather than fragmenting a unit by input spelling.
const UNIT_CANONICAL: Record<string, string> = {
  kg: 'kg',
  steps: 'steps',
  ml: 'ml',
  l: 'ml',
  hrs: 'hrs',
  hr: 'hrs',
  h: 'hrs',
};
const LITER_TO_ML = 1000;
const DEFAULT_CURRENCY = 'INR';

interface StrippedTokens {
  text: string;
  tags: string[];
  priority: 0 | 1 | 2 | 3;
  estimateMin?: number;
  energy?: 'low' | 'med' | 'high';
}

/** Pulls #tags, !priority, ~estimate and @energy out of anywhere in the string. */
function stripTokens(input: string): StrippedTokens {
  const tags: string[] = [];
  let priority: 0 | 1 | 2 | 3 = 0;
  let estimateMin: number | undefined;
  let energy: 'low' | 'med' | 'high' | undefined;

  let text = input
    .replace(TAG_RE, (_match, tag: string) => {
      tags.push(tag);
      return ' ';
    })
    .replace(PRIORITY_RE, (_match, level: string) => {
      priority = PRIORITY_VALUE[level.toLowerCase()];
      return ' ';
    })
    .replace(ENERGY_RE, (_match, level: string) => {
      energy = level.toLowerCase() as 'low' | 'med' | 'high';
      return ' ';
    })
    .replace(ESTIMATE_RE, (_match, hours?: string, minsAfterHours?: string, minsOnly?: string) => {
      estimateMin =
        hours !== undefined
          ? parseInt(hours, 10) * 60 + (minsAfterHours ? parseInt(minsAfterHours, 10) : 0)
          : parseInt(minsOnly!, 10);
      return ' ';
    });

  text = text.replace(/\s+/g, ' ').trim();
  return { text, tags, priority, estimateMin, energy };
}

interface ParsedLog {
  amount: number;
  unit: string;
  title: string;
}

/**
 * "₹500 groceries" / "500rs groceries" -> money (an explicit currency marker
 * required — see CURRENCY_PREFIX_RE/CURRENCY_SUFFIX_RE above); "72.5kg" ->
 * weight (a number with a recognised unit suffix, anywhere in the text). A
 * number immediately followed by an UNRECOGNISED suffix ("500km") is
 * deliberately not treated as a log — that's more likely a typo'd unit than
 * a real measurement.
 */
function parseLog(text: string): ParsedLog | null {
  const currencyMatch = text.match(CURRENCY_PREFIX_RE) ?? text.match(CURRENCY_SUFFIX_RE);
  if (currencyMatch) {
    const title = (
      text.slice(0, currencyMatch.index) + text.slice(currencyMatch.index! + currencyMatch[0].length)
    )
      .replace(/\s+/g, ' ')
      .trim();
    return { amount: parseFloat(currencyMatch[1]), unit: DEFAULT_CURRENCY, title };
  }

  const suffixMatch = text.match(UNIT_SUFFIX_RE);
  if (suffixMatch) {
    const rawAmount = parseFloat(suffixMatch[1]);
    const rawUnit = suffixMatch[2].toLowerCase();
    const unit = UNIT_CANONICAL[rawUnit];
    const amount = rawUnit === 'l' ? rawAmount * LITER_TO_ML : rawAmount;
    const title = (
      text.slice(0, suffixMatch.index) + text.slice(suffixMatch.index! + suffixMatch[0].length)
    )
      .replace(/\s+/g, ' ')
      .trim();
    return { amount, unit, title };
  }

  return null;
}

export async function parseQuickAdd(
  input: string,
  referenceDate: Date = new Date()
): Promise<ParsedQuickAdd> {
  const { text, tags, priority, estimateMin, energy } = stripTokens(input);

  if (!text) {
    return { type: 'task', title: '', tags, priority, estimateMin, energy };
  }

  const log = parseLog(text);
  if (log) {
    return {
      type: 'log',
      title: log.title,
      tags,
      priority,
      amount: log.amount,
      unit: log.unit,
      dayKey: toDayKey(referenceDate),
    };
  }

  const chrono = await import('chrono-node');
  const results = chrono.parse(text, referenceDate, { forwardDate: true });

  if (results.length === 0) {
    return { type: 'task', title: text, tags, priority, estimateMin, energy };
  }

  if (results.length > 1) {
    return {
      type: 'task',
      title: text,
      tags,
      priority,
      estimateMin,
      energy,
      dateHint: 'Multiple dates mentioned — set one manually',
    };
  }

  const [result] = results;
  const date = result.start.date();
  const hasTime = result.start.isCertain('hour');

  // chrono's match doesn't consume a preposition introducing it — "lunch at
  // noon" matches only "noon", leaving a dangling "lunch at". Strip a trailing
  // at/on/by/in/for/from immediately before the match; this is the same
  // "no leftover fragments" standard as the #/!/~/@ token stripping above.
  const before = text
    .slice(0, result.index)
    .replace(/\b(?:at|on|by|in|for|from)\s*$/i, '');
  const after = text.slice(result.index + result.text.length);
  const title = (before + after).replace(/\s+/g, ' ').trim();

  return {
    type: 'task',
    title,
    tags,
    priority,
    estimateMin,
    energy,
    dayKey: toDayKey(date),
    startMin: hasTime ? date.getHours() * 60 + date.getMinutes() : undefined,
  };
}
