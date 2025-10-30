import { PageSection, Title } from '@patternfly/react-core'
import AppLayout from '../components/layouts/AppLayout'

const VirtualMachines: React.FC = () => {
  return (
    <AppLayout>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Virtual Machines
        </Title>
      </PageSection>
    </AppLayout>
  )
}

export default VirtualMachines
