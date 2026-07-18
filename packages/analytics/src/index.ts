import type {TryOnCategory, TryOnOutcome} from '@visioncart/contracts';

export const analyticsEvents = [
  'product_viewed',
  'tryon_requested',
  'tryon_ready',
  'tracking_stable',
  'manual_adjustment',
  'tryon_captured',
  'tryon_shared',
  'seller_opened',
  'tryon_failed',
  'tryon_closed',
] as const;

export type AnalyticsEventName = (typeof analyticsEvents)[number];

export interface TryOnSessionSummary {
  readonly sessionId: string;
  readonly category: TryOnCategory;
  readonly outcome: TryOnOutcome;
  readonly durationMs: number;
}
