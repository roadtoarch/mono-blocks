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

import { FEATURES } from '../../tenant/features';
import { useFeature } from '../../tenant/useFeature';
import { useTenant } from '../../tenant/useTenant';

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
 * Side-navigation layout variant — Carbon {@link Header} with a
 * {@link HeaderMenuButton} toggle and tenant branding, plus a persistent
 * {@link SideNav} for primary navigation.
 *
 * Used for tenants configured with `layout: 'side-nav'`.
 */
const SideNavLayout: FC<SideNavLayoutProps> = ({ children }) => {
  const auth = useAuth();
  const tenant = useTenant();
  const showUserManagement = useFeature(FEATURES.USER_MANAGEMENT);

  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useHeaderTheme();

  const profile = auth.user?.profile;
  const displayName = profile?.name ?? 'Unknown';
  const email = profile?.email ?? '';
  const tenantId = typeof profile?.tenant_id === 'string' ? profile.tenant_id : undefined;

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
        <HeaderName prefix="BCGov">{tenant.displayName}</HeaderName>
        <HeaderGlobalBar>
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
          <Button kind="ghost" renderIcon={Logout} onClick={() => void auth.signoutRedirect()}>
            Log out
          </Button>
        </div>
      </HeaderPanel>

      <SideNav aria-label="Primary navigation" expanded={isSideNavExpanded} isPersistent>
        <SideNavItems>
          <SideNavLink as={Link} to="/dashboard" renderIcon={Home}>
            Dashboard
          </SideNavLink>
          {showUserManagement && (
            <SideNavLink as={Link} to="/users" renderIcon={UserMultiple}>
              Users
            </SideNavLink>
          )}
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

export default SideNavLayout;
