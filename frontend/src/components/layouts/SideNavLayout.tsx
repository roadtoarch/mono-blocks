import { Home, Logout, UserAvatar, UserMultiple } from '@carbon/icons-react';
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  HeaderPanel,
  SideNav,
  SideNavItems,
  SideNavLink,
} from '@carbon/react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { useOfflineAllowed } from '../../offline/use-offline-allowed';
import { FEATURES } from '../../tenant/features';
import { useFeature } from '../../tenant/useFeature';
import { useTenant } from '../../tenant/useTenant';
import { OutboxIndicator } from '../connectivity/outbox-indicator';
import { useConnectivity } from '../connectivity/use-connectivity';
import { PinnedRecordsList } from '../offline/pinned-records-list';
import { StorageIndicator } from '../offline/storage-indicator';
import { ThemeToggle } from '../ThemeToggle';

import { useHeaderTheme } from './useHeaderTheme';

import type { FC, ReactNode } from 'react';

interface SideNavLayoutProps {
  readonly children: ReactNode;
}

/** Width in px of Carbon's expanded {@link SideNav}. */
const SIDE_NAV_EXPANDED_WIDTH = 256;
/** Width in px of Carbon's collapsed (rail) {@link SideNav}. */
const SIDE_NAV_COLLAPSED_WIDTH = 48;

/**
 * Navigation item configuration for the side nav.
 *
 * `offlineAvailable` mirrors the route's `staticData.offlineAvailable`
 * flag so the SideNavLayout can filter items when the user is offline
 * and has the `OFFLINE_ALLOWED` role.
 */
interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: FC<{ size?: number }>;
  readonly featureFlag?: string;
  readonly offlineAvailable: boolean;
}

/**
 * Primary navigation items.
 *
 * Keep in sync with route `staticData.offlineAvailable` flags in
 * `frontend/src/routes/`.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, offlineAvailable: true },
  {
    to: '/users',
    label: 'Users',
    icon: UserMultiple,
    featureFlag: FEATURES.USER_MANAGEMENT,
    offlineAvailable: true,
  },
];

/**
 * Side-navigation layout variant — Carbon {@link Header} with a
 * {@link HeaderMenuButton} toggle and tenant branding, plus a persistent
 * {@link SideNav} for primary navigation.
 *
 * When the user is offline **and** has the `OFFLINE_ALLOWED` role,
 * navigation items are filtered to only show routes marked as
 * `offlineAvailable` (DEC-9). The profile {@link HeaderPanel} also
 * shows the {@link StorageIndicator} and {@link PinnedRecordsList}.
 */
const SideNavLayout: FC<SideNavLayoutProps> = ({ children }) => {
  const auth = useAuth();
  const tenant = useTenant();
  const offlineAllowed = useOfflineAllowed();
  const { isOnline } = useConnectivity();

  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useHeaderTheme();

  const profile = auth.user?.profile;
  const displayName = profile?.name ?? 'Unknown';
  const email = profile?.email ?? '';
  const tenantId = typeof profile?.tenant_id === 'string' ? profile.tenant_id : undefined;

  // When offline + OFFLINE_ALLOWED, filter nav items to only those
  // that are available offline. All items are shown when online or
  // when the user doesn't have the offline role.
  const visibleNavItems =
    offlineAllowed && !isOnline ? NAV_ITEMS.filter((item) => item.offlineAvailable) : NAV_ITEMS;

  return (
    <>
      <Header aria-label={`${tenant.displayName} application shell`}>
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
          onClick={() => {
            setIsSideNavExpanded((prev) => !prev);
          }}
          isActive={isSideNavExpanded}
        />
        {tenant.theme.logoUrl !== '' && (
          <img
            src={tenant.theme.logoUrl}
            alt=""
            style={{
              height: '1.25rem',
              marginLeft: '1rem',
              verticalAlign: 'middle',
            }}
          />
        )}
        <HeaderName>{tenant.displayName}</HeaderName>
        <HeaderGlobalBar>
          <OutboxIndicator />
          <ThemeToggle />
          <HeaderGlobalAction
            aria-label="User profile"
            isActive={isPanelOpen}
            onClick={() => {
              setIsPanelOpen((prev) => !prev);
            }}
          >
            <UserAvatar size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <HeaderPanel
        aria-label="User panel"
        expanded={isPanelOpen}
        onHeaderPanelFocus={() => {
          setIsPanelOpen(false);
        }}
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <p style={{ fontWeight: 600 }}>{displayName}</p>
          {email !== '' && <p>{email}</p>}
          {tenantId !== undefined && <p>Tenant: {tenantId}</p>}
          {offlineAllowed && <StorageIndicator />}
          {offlineAllowed && <PinnedRecordsList />}
          <Button kind="ghost" renderIcon={Logout} onClick={() => void auth.signoutRedirect()}>
            Log out
          </Button>
        </div>
      </HeaderPanel>

      <SideNav aria-label="Primary navigation" expanded={isSideNavExpanded} isPersistent>
        <SideNavItems>
          {visibleNavItems.map((item) => {
            return (
              <NavSideNavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                featureFlag={item.featureFlag}
              />
            );
          })}
        </SideNavItems>
      </SideNav>

      <main
        style={{
          paddingTop: '3rem',
          marginLeft: isSideNavExpanded ? SIDE_NAV_EXPANDED_WIDTH : SIDE_NAV_COLLAPSED_WIDTH,
          transition: 'margin-left 0.15s cubic-bezier(0.2, 0, 0.38, 0.9)',
        }}
      >
        {children}
      </main>
    </>
  );
};

/**
 * Props for the {@link NavSideNavLink} component.
 * Omits `offlineAvailable` since filtering is done at the layout level.
 */
interface NavSideNavLinkProps {
  readonly to: string;
  readonly label: string;
  readonly icon: FC<{ size?: number }>;
  readonly featureFlag?: string;
}

/**
 * Individual nav link that conditionally renders based on a feature flag.
 *
 * Extracted so `useFeature` is not called in a loop (rules of hooks).
 * When `featureFlag` is `undefined`, the link always renders.
 */
const NavSideNavLink: FC<NavSideNavLinkProps> = ({ to, label, icon: Icon, featureFlag }) => {
  const showItem = useFeature(featureFlag ?? '');
  if (featureFlag !== undefined && !showItem) {
    return null;
  }
  return (
    <SideNavLink as={Link} to={to} renderIcon={Icon}>
      {label}
    </SideNavLink>
  );
};

export default SideNavLayout;
