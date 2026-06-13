import React from 'react'
import { useAppStore } from '@/store/appStore'
import { permissionManager } from '@/engine/permissionManager'
import type { PermissionRequest } from '@/types/promptPack'

interface PermissionModalProps {
  request: PermissionRequest
}

function PermissionModal({ request }: PermissionModalProps): React.ReactElement {
  const { resolvePermission } = useAppStore()

  const handleDecision = (granted: boolean) => {
    resolvePermission(request.id, granted)
    permissionManager.resolve(request.id, granted)
  }

  const riskEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  }[request.riskLevel]

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal">
        <div className="modal-title">Permission Required</div>
        <div className="modal-subtitle">An agent wants to perform an action</div>

        <div
          className={`modal-risk ${request.riskLevel}`}
        >
          {riskEmoji} Risk: {request.riskLevel.toUpperCase()}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
            Action
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {request.action}
          </div>
        </div>

        <div className="modal-description">
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
            {request.description}
          </div>
          {request.details && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
              {request.details}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={() => handleDecision(false)}
          >
            Deny
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleDecision(true)}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

export function PermissionLayer(): React.ReactElement | null {
  const permissionRequests = useAppStore((s) => s.permissionRequests)
  const pending = permissionRequests.filter((r) => !r.resolved)

  if (pending.length === 0) return null

  return <PermissionModal request={pending[0]} />
}
