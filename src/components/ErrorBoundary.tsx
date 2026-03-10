import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: "20px 24px",
            color: "var(--danger)",
            fontSize: 13,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Render error</div>
          <div style={{ color: "var(--tx3)", fontSize: 12, marginBottom: 12 }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              background: "var(--hover)",
              border: "1px solid var(--brd)",
              borderRadius: 6,
              color: "var(--tx2)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
