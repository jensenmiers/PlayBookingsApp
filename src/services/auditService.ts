/**
 * Audit logging service to replace log_audit_trail() trigger
 */

import { createClient } from '@/lib/supabase/server'
import type { AuditLog } from '@/types'

export class AuditService {
  private supabase = createClient()

  /**
   * Log a create action
   */
  async logCreate(
    tableName: string,
    recordId: string,
    userId: string,
    newValues: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action: 'create',
      new_values: newValues,
      user_id: userId,
    })

    if (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log audit trail:', error)
    }
  }

  /**
   * Log an update action
   */
  async logUpdate(
    tableName: string,
    recordId: string,
    userId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action: 'update',
      old_values: oldValues,
      new_values: newValues,
      user_id: userId,
    })

    if (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log audit trail:', error)
    }
  }

  /**
   * Log a delete action
   */
  async logDelete(
    tableName: string,
    recordId: string,
    userId: string,
    oldValues: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action: 'delete',
      old_values: oldValues,
      user_id: userId,
    })

    if (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log audit trail:', error)
    }
  }
}



