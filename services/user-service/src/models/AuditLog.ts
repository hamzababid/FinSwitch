/**
 * Audit Log Model
 * MongoDB schema for audit logs
 * Implements Requirement 10.2
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
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DEACTIVATED',
        'USER_LOGIN_SUCCESS',
        'USER_LOGIN_FAILED',
        'USER_VIEWED',
        'ROLE_ASSIGNED',
        'ROLE_REMOVED',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['USER', 'ROLE', 'AUTH'],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    changes: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      correlationId: String,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
