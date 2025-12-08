import { Label } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'

interface StatusBadgeProps {
  state?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state }) => {
  const { t } = useTranslation('common')

  if (!state) {
    return <Label color="grey">{t('status.unknown')}</Label>
  }

  const normalizedState = state.toUpperCase()

  if (normalizedState.includes('READY')) {
    return <Label color="green">{t('status.ready')}</Label>
  } else if (normalizedState.includes('PROGRESSING')) {
    return <Label color="blue">{t('status.pending')}</Label>
  } else if (normalizedState.includes('FAILED')) {
    return <Label color="red">{t('status.failed')}</Label>
  }

  return <Label color="grey">{state}</Label>
}
