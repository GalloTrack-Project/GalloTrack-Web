'use client';
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = { children: ReactNode; label?: string };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-danger rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6" /></div>
          <h3 className="text-sm font-extrabold text-rose-800 dark:text-rose-300">
            {this.props.label || 'Section'} Error
          </h3>
          <p className="text-sm text-danger dark:text-rose-300 font-medium max-w-sm mx-auto">
            {this.state.error?.message || 'Something went wrong in this section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-md cursor-pointer transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
