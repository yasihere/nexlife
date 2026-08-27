import { useState } from 'react';
import { seed } from '../data/seed';

/** Dev-only Seed + Tests affordances — see Phase 5's bundle verification: this
 *  whole module (and everything it imports) is dead-code-eliminated from
 *  production builds, not merely lazy, because it's only ever reached behind
 *  `import.meta.env.DEV`. */
export default function DevTools() {
  const [summary, setSummary] = useState<string | null>(null);

  async function runTests(): Promise<void> {
    const [{ runParseTests }, { runRecurrenceTests }] = await Promise.all([
      import('../data/parseTestCases'),
      import('../data/recurrenceTestCases'),
    ]);
    const results = [...(await runParseTests()), ...runRecurrenceTests()];
    const failed = results.filter((r) => r.failures.length > 0);
    setSummary(`${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      // eslint-disable-next-line no-console
      console.table(failed.map((r) => ({ name: r.name, failures: r.failures.join('; ') })));
    }
  }

  return (
    <div className="flex items-center gap-3">
      {summary && <span className="text-[11px] text-muted">{summary}</span>}
      <button
        type="button"
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
        onClick={() => void runTests()}
      >
        Tests
      </button>
      <button
        type="button"
        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
        onClick={() => void seed()}
      >
        Seed
      </button>
    </div>
  );
}
