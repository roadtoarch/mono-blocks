import { Logout, UserAvatar } from '@carbon/icons-react';
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  HeaderPanel,
} from '@carbon/react';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { useTenant } from '../../tenant/useTenant';

import { useHeaderTheme } from './useHeaderTheme';

import type { FC, ReactNode } from 'react';

interface TopNavLayoutProps {
  readonly children: ReactNode;
}

/**
 * Top-navigation layout variant — Carbon {@link Header} with tenant branding,
 * a {@link HeaderGlobalBar} user avatar, and a slide-out {@link HeaderPanel}
 * with profile information and a log-out button.
 *
 * This preserves the original AppShell behaviour for tenants configured with
 * `layout: 'top-nav'` (or when `layout` is omitted).
 */
const TopNavLayout: FC<TopNavLayoutProps> = ({ children }) => {
  const auth = useAuth();
  const tenant = useTenant();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useHeaderTheme();

  const profile = auth.user?.profile;
  const displayName = profile?.name ?? 'Unknown';
  const email = profile?.email ?? '';
  const tenantId = typeof profile?.tenant_id === 'string' ? profile.tenant_id : undefined;

  return (
    <>
      <Header aria-label={`${tenant.displayName} application shell`}>
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

      <main style={{ paddingTop: '3rem' }}>{children}</main>
    </>
  );
};

export default TopNavLayout;
