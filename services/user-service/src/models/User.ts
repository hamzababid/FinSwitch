/**
 * User Model
 * MongoDB schema for user accounts
 * Implements Requirements 7.1, 7.3, 7.6
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata: {
    createdBy: string;
    lastModifiedBy: string;
  };
}

const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      required: true,
      default: ['Developer'],
      validate: {
        validator: function (roles: string[]) {
          const validRoles = ['Admin', 'Operations', 'Auditor', 'Developer'];
          return roles.every(role => validRoles.includes(role));
        },
        message: 'Invalid role specified',
      },
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    metadata: {
      createdBy: {
        type: String,
        required: true,
        default: 'system',
      },
      lastModifiedBy: {
        type: String,
        required: true,
        default: 'system',
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes for performance
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ userId: 1 }, { unique: true });
UserSchema.index({ isActive: 1 });

// Remove password from JSON output
UserSchema.set('toJSON', {
  transform: function (_doc, ret) {
    const { passwordHash, __v, ...rest } = ret;
    return rest;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
