import '@fontsource-variable/inter/wght.css';

import type {ReactNode} from 'react';

export default function Root({children}: {readonly children: ReactNode}): ReactNode {
  return children;
}
