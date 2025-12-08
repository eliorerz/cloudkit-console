import React, { Component, ReactNode } from 'react'
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  Button,
  Title,
} from '@patternfly/react-core'
import { ExclamationCircleIcon } from '@patternfly/react-icons'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught an error', { error, errorInfo })
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReload = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            padding: '20px',
          }}
        >
          <EmptyState>
            <ExclamationCircleIcon
              color="var(--pf-v6-global--danger-color--100)"
              style={{ marginBottom: '1rem', fontSize: '3rem' }}
            />
            <Title headingLevel="h1" size="lg">
              Something went wrong
            </Title>
            <EmptyStateBody>
              {this.state.error && (
                <>
                  <p style={{ marginBottom: '1rem' }}>
                    The application encountered an unexpected error.
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <details style={{ textAlign: 'left', marginTop: '1rem' }}>
                      <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                        Error details
                      </summary>
                      <pre
                        style={{
                          background: '#f5f5f5',
                          padding: '1rem',
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong>Error:</strong> {this.state.error.toString()}
                        {this.state.errorInfo && (
                          <>
                            {'\n\n'}
                            <strong>Component Stack:</strong>
                            {this.state.errorInfo.componentStack}
                          </>
                        )}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </EmptyStateBody>
            <EmptyStateActions>
              <Button variant="primary" onClick={this.handleReload}>
                Reload Application
              </Button>
              <Button variant="link" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </EmptyStateActions>
          </EmptyState>
        </div>
      )
    }

    return this.props.children
  }
}
