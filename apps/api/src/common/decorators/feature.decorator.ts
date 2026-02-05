import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'require_feature';

/**
 * Tier feature names that can be enabled/disabled per tier.
 * Maps to Tier model boolean flags:
 * - 'sepa' -> sepaEnabled
 * - 'reports' -> reportsEnabled
 * - 'bankImport' -> bankImportEnabled
 */
export type TierFeature = 'sepa' | 'reports' | 'bankImport';

/**
 * Decorator to require a tier feature for an endpoint.
 *
 * The TierGuard will check if the club's tier has this feature enabled.
 *
 * Usage: @RequireFeature('sepa')
 *
 * For multiple features (AND logic), stack decorators:
 * @RequireFeature('sepa')
 * @RequireFeature('reports')
 */
export const RequireFeature = (feature: TierFeature) =>
  SetMetadata(FEATURE_KEY, feature);
