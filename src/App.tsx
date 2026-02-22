import { Component, type ReactNode } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { BacktestPage } from "./pages/BacktestPage";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-0 flex items-center justify-center p-8">
          <div className="bg-surface-1 border border-bear/30 rounded-xl p-6 max-w-lg">
            <h1 className="text-bear font-bold mb-2">Dashboard Error</h1>
            <p className="text-sm text-zinc-400 font-mono whitespace-pre-wrap">
              {this.state.error.message}
            </p>
            <p className="text-xs text-zinc-600 font-mono whitespace-pre-wrap mt-2 max-h-40 overflow-auto">
              {this.state.error.stack}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NavOverlay() {
  const location = useLocation();
  const isBacktest = location.pathname === "/backtest";

  if (isBacktest) return null;

  return (
    <Link
      to="/backtest"
      className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-accent/15 text-accent rounded-lg text-xs font-semibold hover:bg-accent/25 transition-colors border border-accent/20"
    >
      Backtester
    </Link>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NavOverlay />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/backtest" element={<BacktestPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
