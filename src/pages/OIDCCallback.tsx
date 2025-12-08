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
import { loadConfig, getUserManager } from '../auth/oidcConfig'
import { useAuth } from '../hooks/useAuth'
import { logger } from '@/utils/logger'

export const OIDCCallback: React.FC = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  // Handle the OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Ensure config is loaded (safe to call multiple times now that we removed the singleton reset)
        await loadConfig()

        // Get the userManager
        const userManager = getUserManager()

        logger.info('OIDCCallback: Starting signin callback...')

        // Complete the OIDC signin process
        const user = await userManager.signinRedirectCallback()

        logger.info('OIDCCallback: Signin callback completed', { username: user?.profile?.preferred_username })

        if (!user) {
          setError('No user returned from authentication')
          return
        }

        // Get the return URL from state or default to overview
        const url = (user.state as { returnUrl?: string })?.returnUrl || '/overview'

        logger.info('OIDCCallback: Navigation details', { targetUrl: url, expired: user.expired })

        // Store the target URL - the second useEffect will handle navigation
        // when isAuthenticated becomes true
        setTargetUrl(url)
      } catch (err) {
        logger.error('OIDC callback error', err)
        setError(err instanceof Error ? err.message : 'An error occurred during login')
      }
    }

    handleCallback()
  }, [])

  // Navigate once authentication state is updated
  useEffect(() => {
    logger.info('OIDCCallback: Navigation check', { targetUrl, isAuthenticated })
    if (targetUrl && isAuthenticated) {
      logger.info('OIDCCallback: Auth state updated, navigating', { targetUrl })
      navigate(targetUrl, { replace: true })
    }
  }, [targetUrl, isAuthenticated, navigate])

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
