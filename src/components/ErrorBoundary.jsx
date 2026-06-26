import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', this.props.label || '', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">{this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}</p>
          {this.props.onRetry && (
            <button
              onClick={() => { this.setState({ hasError: false }); this.props.onRetry(); }}
              className="mt-3 px-4 py-2 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}