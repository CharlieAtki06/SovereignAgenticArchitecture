import type {ReactNode} from 'react';

import CodeGraphViewer from '../../components/CodeGraphViewer';

export default function ZoneTwoCodeGraphPage(): ReactNode {
  return (
    <CodeGraphViewer
      zone="zone2"
      title="Governance Gateway code graph"
      description="Explore the code structure captured from the pinned Zone 2 revision. This viewer is evidence, not the canonical system topology."
    />
  );
}
