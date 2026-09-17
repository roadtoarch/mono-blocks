/**
 * MonoBlocks — hooks/useContainerWidth.ts
 *
 * Observes the width of a DOM element via ResizeObserver and returns both
 * the raw pixel width and a bucketed Carbon-style breakpoint string.
 *
 * Designed for container-aware responsive behavior: components that live inside
 * sidebars, split panels, dashboard tiles, or any non-full-width container
 * can switch their React render output based on the container's own width
 * rather than the viewport.
 */
import { useEffect, useRef, useState } from 'react';

/** Breakpoint buckets that Carbon components typically branch on. */
export type ContainerBreakpoint = 'sm' | 'md' | 'lg';

/** Options for useContainerWidth. */
export interface UseContainerWidthOptions {
  /**
   * Pixel thresholds used to map a raw width to a breakpoint bucket.
   * Default buckets follow Carbon grid values scaled to a container context:
   * sm: < 320px, md: 320px–671px, lg: >= 672px.
   */
  breakpoints?: { sm: number; md: number };
}

/** Result returned by useContainerWidth. */
export interface UseContainerWidthResult {
  /** Ref to attach to the element whose width should be observed. */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Raw width in pixels (0 before first observation). */
  width: number;
  /** Current breakpoint bucket. */
  breakpoint: ContainerBreakpoint;
}

const DEFAULT_BREAKPOINTS = { sm: 320, md: 672 } as const;

function getBreakpoint(width: number, thresholds: { sm: number; md: number }): ContainerBreakpoint {
  if (width < thresholds.sm) return 'sm';
  if (width < thresholds.md) return 'md';
  return 'lg';
}

function toThresholds(options: UseContainerWidthOptions): { sm: number; md: number } {
  return options.breakpoints ?? DEFAULT_BREAKPOINTS;
}

/**
 * Observe the width of a container element and return its current width
 * and breakpoint bucket.
 *
 * @param options - Optional breakpoint thresholds.
 * @returns An object with `ref`, `width`, `breakpoint`.
 */
export function useContainerWidth(options: UseContainerWidthOptions = {}): UseContainerWidthResult {
  const thresholds = toThresholds(options);
  const { sm, md } = thresholds;
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [breakpoint, setBreakpoint] = useState<ContainerBreakpoint>('sm');
  const initializedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = (entryWidth: number) => {
      setWidth(entryWidth);
      setBreakpoint(getBreakpoint(entryWidth, { sm, md }));
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      update(element.getBoundingClientRect().width);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [sm, md]);

  return { ref, width, breakpoint };
}
