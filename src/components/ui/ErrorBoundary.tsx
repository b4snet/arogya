import { Component, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { ErrorState } from './ErrorState';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  title?: string;
  description?: string;
  onLoadDemo?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <ErrorState
            title={this.props.title ?? 'This view paused to protect your session'}
            description={
              this.props.description ??
              'Something unexpected occurred while rendering this page. You can retry cleanly or restore the Demo Mission dataset.'
            }
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
            }
            secondaryAction={
              this.props.onLoadDemo ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    this.props.onLoadDemo?.();
                    this.handleRetry();
                  }}
                >
                  Load Demo Mission
                </Button>
              ) : undefined
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
