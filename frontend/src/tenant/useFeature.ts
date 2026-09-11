import { useTenant } from './useTenant';

/**
 * Returns whether the given feature flag is enabled for the current tenant.
 *
 * Falls back to `false` when the tenant has no `features` configuration
 * or the flag is not defined.
 */
export const useFeature = (name: string): boolean => {
  const tenant = useTenant();
  return tenant.features?.[name] ?? false;
};
