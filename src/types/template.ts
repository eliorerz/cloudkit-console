export interface TemplateParameter {
  name: string
  title?: string
  description?: string
  required?: boolean
  type?: string
  default?: {
    '@type': string
    value?: unknown
  }
}

export interface Template {
  id: string
  title: string
  description?: string
  metadata?: {
    creation_timestamp?: string
    creators?: string[]
  }
  parameters?: TemplateParameter[]
}
