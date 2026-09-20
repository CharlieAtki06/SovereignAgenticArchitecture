import type {ReactNode} from 'react';

import CodeGraphViewer from '../../components/CodeGraphViewer';

export default function ZoneOneCodeGraphPage(): ReactNode {
  return (
    <CodeGraphViewer
      zone="zone1"
      title="Edge Runtime code graph"
      description="Explore the code structure captured from the pinned Zone 1 revision. This viewer is evidence, not the canonical system topology."
    />
  );
}
