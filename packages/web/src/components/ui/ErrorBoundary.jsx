import { Component } from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl">
              <FaExclamationTriangle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {this.props.title || 'Something went wrong'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            {this.props.description || 'An unexpected error occurred. Please try refreshing.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary flex items-center gap-2"
          >
            <FaRedo className="w-3.5 h-3.5" />
            {this.props.retryLabel || 'Try again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
