import useBaseUrl from '@docusaurus/useBaseUrl';
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';

import {productVisuals, resolveProductVisualProvenance} from './productVisuals';
import type {ProductVisualId} from './scenes';
import styles from './ProductVisual.module.css';

export default function ProductVisual({visualId}: {readonly visualId: ProductVisualId}): ReactNode {
  const visual = productVisuals[visualId];
  const imageUrl = useBaseUrl(visual.imagePath);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageStatus, setImageStatus] = useState<'pending' | 'loaded' | 'unavailable'>('pending');
  const provenanceResolved = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const evidenceLock = require('../../../architecture/evidence.lock.json') as unknown;
    return resolveProductVisualProvenance(visual, evidenceLock).every((item) => Boolean(item.href));
  }, [visual]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) {
      setImageStatus('pending');
      return;
    }
    setImageStatus(image.naturalWidth > 0 ? 'loaded' : 'unavailable');
  }, [imageUrl]);

  return (
    <figure
      className={styles.frame}
      data-product-visual={visual.id}
      data-image-status={imageStatus}>
      <span className={styles.label}>{visual.label}</span>
      {imageStatus !== 'unavailable' ? (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={visual.alt}
          width={visual.intrinsicWidth}
          height={visual.intrinsicHeight}
          onLoad={() => setImageStatus('loaded')}
          onError={() => setImageStatus('unavailable')}
        />
      ) : (
        <div className={styles.fallback} role="status">
          <span aria-hidden="true">▣</span>
          <div>
            <strong>NHS Care application capture</strong>
            <p>
              The required application capture could not be loaded. The architecture story remains
              available; use the NHS Care demo guide before continuing to the live application.
            </p>
          </div>
        </div>
      )}
      <figcaption className={styles.caption}>
        <span>{visual.sourceLabel}</span>
        <span>
          {provenanceResolved ? 'Pinned provenance resolved' : 'Source verification unavailable'}
        </span>
      </figcaption>
    </figure>
  );
}
