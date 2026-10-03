import type { ComponentProps } from 'react';

export type MonogramProps = Omit<ComponentProps<'svg'>, 'width' | 'height' | 'viewBox'> & {
  size?: number;
  /** Set when the logo stands alone (e.g. landing hero); omit when next to a text label. */
  title?: string;
};

/**
 * Brand monogram: three stacked bars, two currentColor and one brand accent.
 * Single source of truth for header and landing. The favicon (public/favicon.svg)
 * is a static copy with hardcoded colors, so update it together with this file.
 */
const Monogram = ({ size = 20, title, ...props }: MonogramProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...props}
    >
      <rect x="2" y="2" width="16" height="4" fill="currentColor" />
      <rect x="2" y="8" width="16" height="4" fill="var(--cds-button-primary)" />
      <rect x="2" y="14" width="16" height="4" fill="currentColor" />
    </svg>
  );
};

export default Monogram;