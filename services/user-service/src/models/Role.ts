/**
 * Role Model
 * MongoDB schema for role definitions and permissions
 * Implements Requirement 7.3
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission {
  resource: string;
  actions: string[];
}

export interface IRole extends Document {
  roleId: string;
  roleName: string;
  permissions: IPermission[];
  description: string;
  createdAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
      enum: ['payments', 'users', 'routing', 'settlements', 'reconciliation', 'audit'],
    },
    actions: {
      type: [String],
      required: true,
      validate: {
        validator: function (actions: string[]) {
          const validActions = ['create', 'read', 'update', 'delete'];
          return actions.every(action => validActions.includes(action));
        },
        message: 'Invalid action specified',
      },
    },
  },
  { _id: false }
);

const RoleSchema = new Schema<IRole>(
  {
    roleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roleName: {
      type: String,
      required: true,
      unique: true,
      enum: ['Admin', 'Operations', 'Auditor', 'Developer'],
      index: true,
    },
    permissions: {
      type: [PermissionSchema],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'roles',
  }
);

// Index for role name lookups
RoleSchema.index({ roleName: 1 }, { unique: true });

export const Role = mongoose.model<IRole>('Role', RoleSchema);
