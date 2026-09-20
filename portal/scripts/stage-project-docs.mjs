import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(here, '../..');
const destination = path.resolve(here, '../project-docs');
const files = ['README.md', 'CONTEXT-MAP.md', 'CONTRIBUTING.md', 'AGENTS.md', 'CLAUDE.md'];

await mkdir(destination, {recursive: true});

for (const file of files) {
  const source = path.join(repository, file);
  const target = path.join(destination, file);
  let markdown = await readFile(source, 'utf8');

  // Root sources stay GitHub-friendly. Staged portal copies use route links so
  // Docusaurus can validate links crossing into another content plugin.
  markdown = markdown
    .replaceAll(/\]\(docs\/([^\s)#]+)\.md(#[^)]+)?\)/g, '](/docs/$1$2)')
    .replaceAll(/\]\(contracts\/([^\s)#]+)\.md(#[^)]+)?\)/g, '](/contracts/$1$2)')
    .replaceAll(
      '](architecture/evidence.lock.json)',
      '](https://github.com/CharlieAtki06/SovereignAgenticArchitecture/blob/main/architecture/evidence.lock.json)',
    )
    .replaceAll(
      '](architecture/)',
      '](https://github.com/CharlieAtki06/SovereignAgenticArchitecture/tree/main/architecture)',
    );

  await writeFile(target, markdown);
}
