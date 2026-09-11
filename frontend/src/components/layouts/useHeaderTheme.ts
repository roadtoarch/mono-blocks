import { useEffect } from 'react';

import { useTenant } from '../../tenant/useTenant';

/**
 * Applies the tenant's header theme (background, text, border) to the
 * Carbon `<Header>` element via CSS custom properties.
 *
 * Both {@link TopNavLayout} and {@link SideNavLayout} call this hook so
 * the header branding stays consistent across layout variants.
 */
export const useHeaderTheme = (): void => {
  const tenant = useTenant();

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
};
