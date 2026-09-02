import { Logout, UserAvatar } from '@carbon/icons-react';
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  HeaderPanel,
} from '@carbon/react';
import { useEffect } from 'react';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { useTenant } from '../tenant/useTenant';

import type { FC, ReactNode } from 'react';

interface AppShellProps {
  readonly children: ReactNode;
}

/**
 * Application shell — Carbon {@link Header} with tenant branding and a
 * {@link HeaderPanel} that displays the user's name, email, tenant id,
 * and a log-out button.
 */
const AppShell: FC<AppShellProps> = ({ children }) => {
  const auth = useAuth();
  const tenant = useTenant();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  /* Apply tenant theme to the Carbon <header> element via CSS custom
     properties. Carbon's `.cds--header` reads `--cds-background` for
     background and `--cds-text-primary` for text color; setting these on
     the element itself overrides the global token values and cascades to
     child elements that reference the same properties. */
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.cds--header');
    if (header) {
      header.style.setProperty('--cds-background', tenant.theme.headerBackground);
      header.style.setProperty('--cds-text-primary', tenant.theme.headerText);
      header.style.setProperty('--cds-border-subtle', 'transparent');
    }
  }, [tenant.theme.headerBackground, tenant.theme.headerText]);

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

export default AppShell;
