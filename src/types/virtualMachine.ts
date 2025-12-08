export interface VirtualMachine {
  id: string
  metadata?: {
    name?: string
    creation_timestamp?: string
    creators?: string[]
  }
  spec?: {
    template?: string
    template_parameters?: Record<string, unknown>
  }
  status?: {
    state?: string
    conditions?: VirtualMachineCondition[]
    ip_address?: string
    hub?: string
  }
}

export interface VirtualMachineCondition {
  type?: string
  status?: string
  last_transition_time?: string
  reason?: string
  message?: string
}

export enum VirtualMachineState {
  UNSPECIFIED = 'VIRTUAL_MACHINE_STATE_UNSPECIFIED',
  PROGRESSING = 'VIRTUAL_MACHINE_STATE_PROGRESSING',
  READY = 'VIRTUAL_MACHINE_STATE_READY',
  FAILED = 'VIRTUAL_MACHINE_STATE_FAILED',
}
