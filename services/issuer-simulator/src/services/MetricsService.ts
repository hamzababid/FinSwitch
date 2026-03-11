import { logger } from '../utils/logger';

interface AuthorizationMetrics {
  totalRequests: number;
  approvedRequests: number;
  declinedRequests: number;
  errorRequests: number;
  totalProcessingTimeMs: number;
  lastResetTime: Date;
}

export class MetricsService {
  private metrics: AuthorizationMetrics;

  constructor() {
    this.metrics = {
      totalRequests: 0,
      approvedRequests: 0,
      declinedRequests: 0,
      errorRequests: 0,
      totalProcessingTimeMs: 0,
      lastResetTime: new Date(),
    };
  }

  public recordAuthorization(responseCode: string, processingTimeMs: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalProcessingTimeMs += processingTimeMs;

    if (responseCode === '00') {
      this.metrics.approvedRequests++;
    } else if (responseCode === '96' || responseCode === '91') {
      this.metrics.errorRequests++;
    } else {
      this.metrics.declinedRequests++;
    }

    logger.debug('Authorization metrics updated', {
      responseCode,
      processingTimeMs,
      totalRequests: this.metrics.totalRequests,
    });
  }

  public getMetrics(): AuthorizationMetrics & {
    approvalRate: number;
    declineRate: number;
    errorRate: number;
    averageProcessingTimeMs: number;
  } {
    const approvalRate = this.metrics.totalRequests > 0
      ? (this.metrics.approvedRequests / this.metrics.totalRequests) * 100
      : 0;

    const declineRate = this.metrics.totalRequests > 0
      ? (this.metrics.declinedRequests / this.metrics.totalRequests) * 100
      : 0;

    const errorRate = this.metrics.totalRequests > 0
      ? (this.metrics.errorRequests / this.metrics.totalRequests) * 100
      : 0;

    const averageProcessingTimeMs = this.metrics.totalRequests > 0
      ? this.metrics.totalProcessingTimeMs / this.metrics.totalRequests
      : 0;

    return {
      ...this.metrics,
      approvalRate: Math.round(approvalRate * 100) / 100,
      declineRate: Math.round(declineRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      averageProcessingTimeMs: Math.round(averageProcessingTimeMs * 100) / 100,
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      approvedRequests: 0,
      declinedRequests: 0,
      errorRequests: 0,
      totalProcessingTimeMs: 0,
      lastResetTime: new Date(),
    };

    logger.info('Metrics reset');
  }
}

// Singleton instance
export const metricsService = new MetricsService();
