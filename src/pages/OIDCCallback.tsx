import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Page,
  PageSection,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Title,
  Button
} from '@patternfly/react-core'
import { ExclamationCircleIcon } from '@patternfly/react-icons'
import { userManager } from '../auth/oidcConfig'

export const OIDCCallback: React.FC = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  // Handle the OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Complete the OIDC signin process
        const user = await userManager.signinRedirectCallback()

        if (!user) {
          setError('No user returned from authentication')
          return
        }

        // Get the return URL from state or default to home
        const url = (user.state as { returnUrl?: string })?.returnUrl || '/'

        // Navigate immediately - the user is now in storage and
        // will be picked up by AuthContext on the next page
        navigate(url, { replace: true })
      } catch (err) {
        console.error('OIDC callback error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred during login')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <Page>
        <PageSection isFilled>
          <EmptyState>
            <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" />
            <Title headingLevel="h1" size="lg">
              Login Failed
            </Title>
            <EmptyStateBody>
              {error}
            </EmptyStateBody>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Return to Login
            </Button>
          </EmptyState>
        </PageSection>
      </Page>
    )
  }

  return (
    <Page>
      <PageSection isFilled>
        <EmptyState>
          <Spinner />
          <Title headingLevel="h1" size="lg">
            Completing Login...
          </Title>
          <EmptyStateBody>
            Please wait while we complete your login.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    </Page>
  )
}
