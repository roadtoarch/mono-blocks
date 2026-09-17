/**
 * MonoBlocks — components/LinkButton.tsx
 *
 * Thin wrapper around Carbon Button that renders as a TanStack Router Link.
 * This exists only to bridge Carbon's `as` prop with TanStack Router's `Link`
 * in a type-safe way; the rendered DOM is a real Carbon Button.
 */
import { Button } from '@carbon/react';
import { Link } from '@tanstack/react-router';

import type { ButtonProps } from '@carbon/react';

export interface LinkButtonProps extends Omit<ButtonProps<typeof Link>, 'as' | 'to'> {
  /** TanStack Router destination (any route path). */
  to: string;
}

export function LinkButton({ to, ...rest }: LinkButtonProps) {
  // TanStack's `Link` expects a narrow route-path union; our helpers return
  // plain strings, so we widen at the boundary.
  return <Button as={Link} to={to} {...rest} />;
}
