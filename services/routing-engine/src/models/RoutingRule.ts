/**
 * Routing Rule Model
 * MongoDB schema for routing rules
 * Implements Requirements 2.6
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IRoutingRule extends Document {
  ruleId: string;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  conditions: {
    cardBinRanges?: string[]; // e.g., ["400000-499999", "510000-559999"]
    amountRange?: {
      min?: number;
      max?: number;
    };
    merchantIds?: string[];
    currencies?: string[]; // e.g., ["USD", "EUR", "GBP"]
    transactionTypes?: string[]; // e.g., ["purchase", "refund", "authorization"]
  };
  route: {
    issuerEndpoint: string;
    processorId: string;
    timeout?: number; // milliseconds
    retryAttempts?: number;
  };
  metadata: {
    createdBy: string;
    lastModifiedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RoutingRuleSchema = new Schema<IRoutingRule>(
  {
    ruleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    priority: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
      index: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    conditions: {
      cardBinRanges: {
        type: [String],
        default: undefined,
      },
      amountRange: {
        min: {
          type: Number,
          min: 0,
        },
        max: {
          type: Number,
          min: 0,
        },
      },
      merchantIds: {
        type: [String],
        default: undefined,
      },
      currencies: {
        type: [String],
        default: undefined,
      },
      transactionTypes: {
        type: [String],
        default: undefined,
      },
    },
    route: {
      issuerEndpoint: {
        type: String,
        required: true,
        trim: true,
      },
      processorId: {
        type: String,
        required: true,
        trim: true,
      },
      timeout: {
        type: Number,
        min: 1000,
        max: 60000,
        default: 30000,
      },
      retryAttempts: {
        type: Number,
        min: 0,
        max: 5,
        default: 3,
      },
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
    collection: 'routing_rules',
  }
);

// Compound indexes for efficient querying
RoutingRuleSchema.index({ enabled: 1, priority: -1 });
RoutingRuleSchema.index({ 'conditions.cardBinRanges': 1 });
RoutingRuleSchema.index({ 'conditions.merchantIds': 1 });
RoutingRuleSchema.index({ 'conditions.currencies': 1 });

// Remove internal fields from JSON output
RoutingRuleSchema.set('toJSON', {
  transform: function (_doc, ret) {
    const { __v, ...rest } = ret;
    return rest;
  },
});

export const RoutingRule = mongoose.model<IRoutingRule>('RoutingRule', RoutingRuleSchema);
