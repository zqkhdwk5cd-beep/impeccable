import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import type { PermissionRequest } from '@/types/promptPack'

class PermissionManager {
  private pending: Map<string, (granted: boolean) => void> = new Map()

  async request(
    action: string,
    description: string,
    details: string,
    riskLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> {
    const req: PermissionRequest = {
      id: uuidv4(),
      action,
      description,
      details,
      riskLevel,
      resolved: false,
      granted: null,
      timestamp: Date.now()
    }

    eventBus.emit('permission:request', req)

    return new Promise((resolve) => {
      this.pending.set(req.id, resolve)
    })
  }

  resolve(id: string, granted: boolean): void {
    const resolver = this.pending.get(id)
    if (resolver) {
      resolver(granted)
      this.pending.delete(id)
      eventBus.emit('permission:resolved', { id, granted })
    }
  }

  clear(): void {
    this.pending.clear()
  }
}

export const permissionManager = new PermissionManager()
