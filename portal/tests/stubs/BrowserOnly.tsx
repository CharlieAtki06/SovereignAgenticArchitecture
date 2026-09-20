import type {ReactNode} from 'react';

export default function BrowserOnly({fallback}: {readonly fallback?: ReactNode}): ReactNode {
  return fallback ?? null;
}
