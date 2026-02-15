import { Component } from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

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

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative text-center max-w-lg">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-red-500 blur-3xl opacity-10 rounded-full mx-auto w-32 h-32"></div>
              <div className="relative w-24 h-24 mx-auto rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                <FaExclamationTriangle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {this.props.description || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                <FaRedo className="w-3.5 h-3.5" />
                {this.props.retryLabel || 'Try again'}
              </button>
              <button
                onClick={this.handleHome}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-colors"
              >
                <FaHome className="w-3.5 h-3.5" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
