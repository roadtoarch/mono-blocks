/* eslint-disable react-refresh/only-export-components -- TanStack Router route files export both Route config and components by design. */
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
  Tile,
} from '@carbon/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { useInviteUserMutation } from '../api/users';

/** Available roles for user invitation. */
const AVAILABLE_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
] as const;

/**
 * RFC 5322-lite email pattern — good enough for client-side validation.
 * The server performs the authoritative check.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Invite user form — creates a new tenant user with an initial role. */
const InviteUserPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.user?.access_token ?? '';

  const inviteMutation = useInviteUserMutation(accessToken);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const firstNameInvalid = hasAttemptedSubmit && firstName.trim().length === 0;
  const lastNameInvalid = hasAttemptedSubmit && lastName.trim().length === 0;
  const emailInvalid = hasAttemptedSubmit && email.length > 0 && !EMAIL_PATTERN.test(email);

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    EMAIL_PATTERN.test(email) &&
    !inviteMutation.isPending;

  const handleSubmit = useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      setHasAttemptedSubmit(true);
      if (!isFormValid) {
        return;
      }

      inviteMutation.mutate(
        {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        },
        {
          onSuccess: () => {
            void navigate({ to: '/users' });
          },
        },
      );
    },
    [isFormValid, inviteMutation, email, firstName, lastName, role, navigate],
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '40rem' }}>
      <Tile>
        <h2 style={{ marginBottom: '1.5rem' }}>Invite user</h2>

        {inviteMutation.isSuccess && (
          <InlineNotification
            kind="success"
            title="Invitation sent"
            subtitle="The user has been invited and will appear in the user list once they accept."
            lowContrast
            onCloseButtonClick={() => {
              inviteMutation.reset();
            }}
          />
        )}

        {inviteMutation.isError && (
          <InlineNotification
            kind="error"
            title="Failed to invite user"
            subtitle={inviteMutation.error.message}
            lowContrast
            onCloseButtonClick={() => {
              inviteMutation.reset();
            }}
          />
        )}

        <Form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TextInput
              id="invite-first-name"
              labelText="First name"
              placeholder="Enter first name"
              value={firstName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setFirstName(event.target.value);
              }}
              invalid={firstNameInvalid}
              invalidText="First name is required."
              disabled={inviteMutation.isPending}
            />

            <TextInput
              id="invite-last-name"
              labelText="Last name"
              placeholder="Enter last name"
              value={lastName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLastName(event.target.value);
              }}
              invalid={lastNameInvalid}
              invalidText="Last name is required."
              disabled={inviteMutation.isPending}
            />

            <TextInput
              id="invite-email"
              labelText="Email"
              placeholder="user@example.com"
              type="email"
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(event.target.value);
              }}
              invalid={emailInvalid}
              invalidText="Enter a valid email address."
              disabled={inviteMutation.isPending}
            />

            <Select
              id="invite-role"
              labelText="Role"
              value={role}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                setRole(event.target.value);
              }}
              disabled={inviteMutation.isPending}
            >
              {AVAILABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} text={r.label} />
              ))}
            </Select>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" disabled={!isFormValid}>
                {inviteMutation.isPending ? 'Sending invitation…' : 'Send invitation'}
              </Button>
              <Button
                kind="secondary"
                type="button"
                onClick={() => {
                  void navigate({ to: '/users' });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Form>
      </Tile>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/users/invite')({
  component: InviteUserPage,
});
