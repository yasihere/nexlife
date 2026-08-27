import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  exportState: 'idle' | 'exporting' | 'done' | 'failed';
}

/**
 * "A crash must never trap my data" (PROMPTS.md Phase 8, #3). This is the one
 * class component in the app — CLAUDE.md §3 locks function-components-only,
 * but React 18 has no hook equivalent for error boundaries; there's no other
 * way to catch a render-time crash in a child tree.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, exportState: 'idle' };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('NexLife crashed:', error, info.componentStack);
  }

  handleExport = async (): Promise<void> => {
    this.setState({ exportState: 'exporting' });
    try {
      const { exportAndShare } = await import('../data/backup');
      await exportAndShare();
      this.setState({ exportState: 'done' });
    } catch {
      this.setState({ exportState: 'failed' });
    }
  };

  render(): ReactNode {
    const { error, exportState } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col items-center justify-center gap-4 bg-void px-8 text-center">
        <p className="text-heading text-paper">Something broke.</p>
        <p className="text-title text-muted">{error.message}</p>
        <button
          type="button"
          onClick={() => void this.handleExport()}
          disabled={exportState === 'exporting'}
          className="min-h-[44px] rounded bg-signal px-6 text-title font-medium text-void disabled:opacity-40"
        >
          {exportState === 'exporting' ? 'Exporting…' : 'Export data'}
        </button>
        {exportState === 'done' && <p className="text-title text-muted">Exported.</p>}
        {exportState === 'failed' && (
          <p className="text-title text-muted">Export failed too — the data is still on the device.</p>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[44px] text-title text-muted underline"
        >
          Reload
        </button>
      </div>
    );
  }
}
