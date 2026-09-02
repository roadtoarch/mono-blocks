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

import type { FC, ReactNode } from 'react';

interface AppShellProps {
  readonly children: ReactNode;
}

/**
 * Application shell — Carbon {@link Header} with the app name and a
 * {@link HeaderPanel} that displays the user's name, email, tenant id,
 * and a log-out button.
 */
const AppShell: FC<AppShellProps> = ({ children }) => {
  const auth = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const profile = auth.user?.profile;
  const displayName = profile?.name ?? 'Unknown';
  const email = profile?.email ?? '';
  const tenantId = typeof profile?.tenant_id === 'string' ? profile.tenant_id : undefined;

  return (
    <>
      <Header aria-label="Forest application shell">
        <HeaderName prefix="BCGov">Forest</HeaderName>
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
