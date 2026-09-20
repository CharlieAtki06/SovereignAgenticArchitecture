import type {ReactNode} from 'react';

export default function Link({children, to}: {readonly children?: ReactNode; readonly to: string}) {
  return <a href={to}>{children}</a>;
}
