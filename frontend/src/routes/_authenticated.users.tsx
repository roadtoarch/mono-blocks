/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import { Add } from '@carbon/icons-react';
import {
  Button,
  Checkbox,
  DataTable,
  InlineNotification,
  Loading,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

import {
  useUpdateUserRolesMutation,
  useUpdateUserStatusMutation,
  useUsersQuery,
} from '../api/users';

import type { UserSummary } from '../api/users';

/** Default page size — enough for tenants with dozens of users. */
const DEFAULT_PAGE_SIZE = 20;

/** Roles that can be assigned through the UI. */
const ASSIGNABLE_ROLES = ['ADMIN', 'MEMBER'] as const;

/** Column definitions for the users {@link DataTable}. */
const HEADERS = [
  { key: 'name', header: 'Name' },
  { key: 'username', header: 'Username' },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status' },
  { key: 'roles', header: 'Roles' },
  { key: 'actions', header: 'Actions' },
];

/**
 * Builds a display name from the user's first and last name fields,
 * falling back to an en-dash when both are absent.
 */
const formatName = (user: Pick<UserSummary, 'firstName' | 'lastName'>): string => {
  const parts = [user.firstName, user.lastName].filter((s): s is string => s != null && s !== '');
  return parts.length > 0 ? parts.join(' ') : '—';
};

/** Transforms a {@link UserSummary} into a flat row for the {@link DataTable}. */
const toRow = (user: UserSummary) => {
  return {
    id: user.id,
    name: formatName(user),
    username: user.username,
    email: user.email ?? '—',
    status: user.enabled,
    roles: user.roles.join(', '),
  };
};

/** Users management page — displays tenant users with invite and management actions. */
const UsersPage = () => {
  const auth = useAuth();
  const accessToken = auth.user?.access_token ?? '';
  const currentUserId = auth.user?.profile.sub;

  const usersQuery = useUsersQuery(auth.user?.access_token, 0, DEFAULT_PAGE_SIZE);
  const statusMutation = useUpdateUserStatusMutation(accessToken);
  const rolesMutation = useUpdateUserRolesMutation(accessToken);

  // ── Deactivate / activate modal state ──────────────────────────────────
  const [statusTarget, setStatusTarget] = useState<UserSummary | null>(null);

  // ── Roles modal state ──────────────────────────────────────────────────
  const [rolesTarget, setRolesTarget] = useState<UserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState(() => new Set<string>());

  // ── Lookup map: userId → UserSummary ───────────────────────────────────
  const userMap = new Map<string, UserSummary>();
  if (usersQuery.data) {
    for (const user of usersQuery.data.content) {
      userMap.set(user.id, user);
    }
  }

  if (usersQuery.isPending) {
    return <Loading withOverlay description="Loading users…" />;
  }

  if (usersQuery.isError) {
    return (
      <div style={{ padding: '2rem' }}>
        <InlineNotification
          kind="error"
          title="Failed to load users"
          subtitle={usersQuery.error.message}
          lowContrast
        />
      </div>
    );
  }

  const rows = usersQuery.data.content.map(toRow);

  if (rows.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <Tile>
          <p>No users found.</p>
        </Tile>
      </div>
    );
  }

  const isSelf = (userId: string): boolean => userId === currentUserId;

  const handleStatusConfirm = () => {
    if (!statusTarget) {
      return;
    }
    statusMutation.mutate(
      { userId: statusTarget.id, enabled: !statusTarget.enabled },
      {
        onSuccess: () => {
          setStatusTarget(null);
        },
      },
    );
  };

  const handleOpenRolesModal = (user: UserSummary) => {
    setRolesTarget(user);
    setSelectedRoles(new Set(user.roles));
  };

  const handleRolesToggle = (roleName: string, checked: boolean) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleName);
      } else {
        next.delete(roleName);
      }
      return next;
    });
  };

  const handleRolesSave = () => {
    if (!rolesTarget) {
      return;
    }
    // If editing self, ensure ADMIN stays selected.
    const roles = Array.from(selectedRoles);
    if (isSelf(rolesTarget.id) && !roles.includes('ADMIN')) {
      roles.push('ADMIN');
    }
    rolesMutation.mutate(
      { userId: rolesTarget.id, roles },
      {
        onSuccess: () => {
          setRolesTarget(null);
        },
      },
    );
  };

  const statusTargetName = statusTarget !== null ? formatName(statusTarget) : '';
  const statusTargetIsEnabled = statusTarget?.enabled ?? false;
  const rolesTargetName = rolesTarget !== null ? formatName(rolesTarget) : '';
  const isEditingSelfRoles = rolesTarget !== null && isSelf(rolesTarget.id);

  return (
    <div style={{ padding: '2rem' }}>
      {/* ── Header row ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2>Users</h2>
        <Button renderIcon={Add} as={Link} to="/users/invite">
          Invite user
        </Button>
      </div>

      {/* ── Mutation feedback ─────────────────────────────────────────── */}
      {statusMutation.isSuccess && (
        <InlineNotification
          kind="success"
          title="User status updated"
          subtitle="The user's status has been changed."
          lowContrast
          onCloseButtonClick={() => {
            statusMutation.reset();
          }}
        />
      )}
      {statusMutation.isError && (
        <InlineNotification
          kind="error"
          title="Failed to update status"
          subtitle={statusMutation.error.message}
          lowContrast
          onCloseButtonClick={() => {
            statusMutation.reset();
          }}
        />
      )}
      {rolesMutation.isSuccess && (
        <InlineNotification
          kind="success"
          title="Roles updated"
          subtitle="The user's roles have been updated."
          lowContrast
          onCloseButtonClick={() => {
            rolesMutation.reset();
          }}
        />
      )}
      {rolesMutation.isError && (
        <InlineNotification
          kind="error"
          title="Failed to update roles"
          subtitle={rolesMutation.error.message}
          lowContrast
          onCloseButtonClick={() => {
            rolesMutation.reset();
          }}
        />
      )}

      {/* ── Users DataTable ───────────────────────────────────────────── */}
      <DataTable rows={rows} headers={HEADERS}>
        {({
          rows: tableRows,
          headers: tableHeaders,
          getTableProps,
          getHeaderProps,
          getRowProps,
        }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header) => {
                    const { key: headerKey, ...headerRest } = getHeaderProps({ header });
                    return (
                      <TableHeader key={headerKey} {...headerRest}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => {
                  const { key: rowKey, ...rowRest } = getRowProps({ row });
                  const user = userMap.get(row.id);
                  return (
                    <TableRow key={rowKey} {...rowRest}>
                      {row.cells.map((cell) => {
                        if (cell.info.header === 'status') {
                          return (
                            <TableCell key={cell.id}>
                              <Tag type={cell.value ? 'green' : 'red'}>
                                {cell.value ? 'Active' : 'Inactive'}
                              </Tag>
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'actions' && user) {
                          return (
                            <TableCell key={cell.id}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!isSelf(user.id) && (
                                  <Button
                                    kind={user.enabled ? 'danger--ghost' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                      setStatusTarget(user);
                                    }}
                                  >
                                    {user.enabled ? 'Deactivate' : 'Activate'}
                                  </Button>
                                )}
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  onClick={() => {
                                    handleOpenRolesModal(user);
                                  }}
                                >
                                  Change roles
                                </Button>
                              </div>
                            </TableCell>
                          );
                        }
                        return <TableCell key={cell.id}>{cell.value}</TableCell>;
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      {/* ── Deactivate / Activate confirmation modal ──────────────────── */}
      <Modal
        open={statusTarget !== null}
        modalHeading={
          statusTargetIsEnabled
            ? `Deactivate ${statusTargetName}?`
            : `Activate ${statusTargetName}?`
        }
        modalLabel="Confirm action"
        primaryButtonText={statusTargetIsEnabled ? 'Deactivate' : 'Activate'}
        secondaryButtonText="Cancel"
        danger={statusTargetIsEnabled}
        onRequestClose={() => {
          setStatusTarget(null);
        }}
        onRequestSubmit={handleStatusConfirm}
        primaryButtonDisabled={statusMutation.isPending}
      >
        <p style={{ marginBottom: '1rem' }}>
          {statusTargetIsEnabled
            ? `Are you sure you want to deactivate ${statusTargetName}? They will lose access to the application.`
            : `Are you sure you want to activate ${statusTargetName}? They will regain access to the application.`}
        </p>
      </Modal>

      {/* ── Roles management modal ────────────────────────────────────── */}
      <Modal
        open={rolesTarget !== null}
        modalHeading={`Manage roles — ${rolesTargetName}`}
        modalLabel="Role assignments"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onRequestClose={() => {
          setRolesTarget(null);
        }}
        onRequestSubmit={handleRolesSave}
        primaryButtonDisabled={rolesMutation.isPending}
      >
        <p style={{ marginBottom: '1rem' }}>Select the roles for {rolesTargetName}.</p>
        {ASSIGNABLE_ROLES.map((roleName) => {
          const isSelfAdmin =
            isEditingSelfRoles && roleName === 'ADMIN' && rolesTarget.roles.includes('ADMIN');
          return (
            <Checkbox
              key={roleName}
              id={`role-${roleName}`}
              labelText={roleName}
              checked={selectedRoles.has(roleName)}
              disabled={isSelfAdmin}
              onChange={(
                _event: React.ChangeEvent<HTMLInputElement>,
                { checked }: { checked: boolean },
              ) => {
                handleRolesToggle(roleName, checked);
              }}
            />
          );
        })}
        {isEditingSelfRoles && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>
            You cannot remove your own Admin role.
          </p>
        )}
      </Modal>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/users')({
  component: UsersPage,
});
