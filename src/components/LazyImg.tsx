"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  lazy?: boolean;
};

/** Avoids hydration mismatch: lazy/decoding apply only after mount. */
export function LazyImg({ lazy = true, loading, decoding, ...props }: Props) {
  const hydrated = useHydrated();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      loading={hydrated && lazy ? (loading ?? "lazy") : undefined}
      decoding={hydrated && lazy ? (decoding ?? "async") : undefined}
    />
  );
}
