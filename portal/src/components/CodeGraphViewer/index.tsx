import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import type {ReactNode} from 'react';

import styles from './styles.module.css';

interface CodeGraphViewerProps {
  readonly zone: 'zone1' | 'zone2';
  readonly title: string;
  readonly description: string;
}

export default function CodeGraphViewer({
  zone,
  title,
  description,
}: CodeGraphViewerProps): ReactNode {
  const viewerUrl = useBaseUrl(`/code-graphs/${zone}/graph.html`);

  return (
    <Layout title={title} description={description} noFooter>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <span>Code evidence · pinned revision</span>
            <h1>{title}</h1>
          </div>
          <p>{description}</p>
        </header>
        <iframe
          className={styles.viewer}
          src={viewerUrl}
          title={`${title} interactive Graphify viewer`}
          loading="eager"
        />
      </main>
    </Layout>
  );
}
