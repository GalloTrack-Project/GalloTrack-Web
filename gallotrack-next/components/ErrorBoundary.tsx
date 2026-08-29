'use client';
import React, { Component, type ReactNode } from 'react';

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
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto">⚠️</div>
          <h3 className="text-sm font-extrabold text-rose-800">
            {this.props.label || 'Section'} Error
          </h3>
          <p className="text-xs text-rose-600 font-medium max-w-sm mx-auto">
            {this.state.error?.message || 'Something went wrong in this section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
