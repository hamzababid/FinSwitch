/**
 * Audit Log Model
 * Records routing rule changes for audit trail
 * Implements Requirement 10.3
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  auditId: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      correlationId: { type: String },
    },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    collection: 'audit_logs',
    timestamps: false,
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
