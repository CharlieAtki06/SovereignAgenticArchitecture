import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../docs/graphs');
const destination = path.resolve(here, '../static/code-graphs');

// macOS may attach a non-removable provenance xattr to generated directories.
// Stage the small, known output set deterministically instead of deleting the
// directory tree first. Every copied file is overwritten on each run.
await mkdir(destination, {recursive: true});
await cp(path.join(source, 'README.md'), path.join(destination, 'README.md'));
await cp(path.join(source, 'manifest.json'), path.join(destination, 'manifest.json'));
for (const zone of ['zone1', 'zone2']) {
  await mkdir(path.join(destination, zone), {recursive: true});
  await cp(
    path.join(source, zone, 'graph.html'),
    path.join(destination, zone, 'graph.html'),
  );
}

const assets = path.join(destination, 'assets');
await mkdir(assets, {recursive: true});
await cp(
  path.resolve(here, '../node_modules/vis-network/standalone/umd/vis-network.min.js'),
  path.join(assets, 'vis-network.min.js'),
);

const remoteScript = /<script src="https:\/\/unpkg\.com\/vis-network@9\.1\.6\/standalone\/umd\/vis-network\.min\.js"\s+integrity="[^"]+"\s+crossorigin="anonymous"><\/script>/;
for (const zone of ['zone1', 'zone2']) {
  const viewer = path.join(destination, zone, 'graph.html');
  const html = await readFile(viewer, 'utf8');
  if (!remoteScript.test(html)) {
    throw new Error(`Expected Graphify CDN script was not found in ${viewer}`);
  }
  await writeFile(
    viewer,
    html.replace(remoteScript, '<script src="../assets/vis-network.min.js"></script>'),
  );
}
