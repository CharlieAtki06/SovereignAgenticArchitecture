import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import type {ReactNode} from 'react';

import styles from './code-graphs.module.css';

export default function CodeGraphsPage(): ReactNode {
  return (
    <Layout title="Code graphs" description="Generated code-evidence explorers for the two implementation repositories.">
      <main className={styles.page}>
        <p className={styles.kicker}>Secondary evidence explorer</p>
        <h1>Move from the architecture map into code structure.</h1>
        <p className={styles.intro}>
          These committed Graphify viewers are generated from the revisions recorded beside them.
          They explain code-level relationships; they do not override the canonical LikeC4 topology,
          the boundary contract, or an ADR.
        </p>
        <div className={styles.grid}>
          <Link className={styles.card} to="/code-graphs/zone1">
            <span>Edge — Zone 1</span>
            <h2>Edge Runtime code graph</h2>
            <p>Orchestration, local model, MCP client, App host, desktop and engineering surfaces.</p>
            <strong>Open the interactive viewer →</strong>
          </Link>
          <Link className={styles.card} to="/code-graphs/zone2">
            <span>Governance Gateway — Zone 2</span>
            <h2>Gateway code graph</h2>
            <p>Bounded contexts, governed lifecycle, policy, connectors, disclosures and audit.</p>
            <strong>Open the interactive viewer →</strong>
          </Link>
        </div>
      </main>
    </Layout>
  );
}
