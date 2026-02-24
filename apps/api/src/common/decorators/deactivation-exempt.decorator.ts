import { SetMetadata } from '@nestjs/common';

export const DEACTIVATION_EXEMPT_KEY = 'deactivation-exempt';

/**
 * Marks an endpoint as exempt from DeactivatedClubGuard blocking.
 * Use on endpoints that must remain writable even when a club is deactivated:
 * - Club reactivation endpoint
 * - GDPR Art. 17 member anonymization endpoint
 */
export const DeactivationExempt = () => SetMetadata(DEACTIVATION_EXEMPT_KEY, true);
