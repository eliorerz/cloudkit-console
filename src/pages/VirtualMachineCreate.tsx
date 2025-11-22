import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'
import { CreateVMWizard } from '../components/wizards/CreateVMWizard'
import { getTemplates } from '../api/templates'
import { createVirtualMachine } from '../api/vms'
import { Template } from '../api/types'

const VirtualMachineCreate: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromPage = searchParams.get('from') || 'virtual-machines'

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getTemplates()
        setTemplates(response.items || [])
      } catch (error) {
        console.error('Error fetching templates:', error)
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const handleClose = () => {
    navigate(`/${fromPage}`)
  }

  const handleCreate = async (vmId: string, selectedTemplateId: string, parameters: Record<string, any>) => {
    await createVirtualMachine({
      id: vmId,
      spec: {
        template: selectedTemplateId,
        template_parameters: parameters
      }
    })
    navigate('/virtual-machines')
  }

  if (loading) {
    return <AppLayout><div>Loading...</div></AppLayout>
  }

  return (
    <AppLayout>
      <CreateVMWizard
        isOpen={true}
        onClose={handleClose}
        onCreate={handleCreate}
        templates={templates}
      />
    </AppLayout>
  )
}

export default VirtualMachineCreate
