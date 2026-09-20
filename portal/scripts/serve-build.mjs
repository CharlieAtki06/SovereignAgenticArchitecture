import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

const directory = path.resolve(option('--dir', process.env.PORTAL_BUILD_DIR ?? 'build'));
const host = option('--host', '127.0.0.1');
const port = Number(option('--port', process.env.PORT ?? '3000'));
const baseUrl = '/SovereignAgenticArchitecture/';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`invalid port '${port}'`);
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function redirect(response, location) {
  response.writeHead(302, {location});
  response.end();
}

function candidates(relativePath) {
  if (!relativePath || relativePath === '/') return ['index.html'];
  const clean = relativePath.replace(/^\/+/, '');
  if (path.extname(clean)) return [clean];
  return [`${clean}.html`, path.join(clean, 'index.html')];
}

async function existingFile(relativePath) {
  for (const candidate of candidates(relativePath)) {
    const absolute = path.resolve(directory, candidate);
    const inside = path.relative(directory, absolute);
    if (inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
      continue;
    }
    try {
      if ((await stat(absolute)).isFile()) return absolute;
    } catch {
      // Try the clean-URL alternative.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
    if (url.pathname === '/') {
      redirect(response, baseUrl);
      return;
    }
    if (!url.pathname.startsWith(baseUrl)) {
      redirect(response, baseUrl);
      return;
    }

    let relativePath;
    try {
      relativePath = decodeURIComponent(url.pathname.slice(baseUrl.length));
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    const file = await existingFile(relativePath);
    if (!file) {
      const fallback = path.join(directory, '404.html');
      response.writeHead(404, {'content-type': 'text/html; charset=utf-8'});
      if (request.method === 'HEAD') response.end();
      else createReadStream(fallback).pipe(response);
      return;
    }

    const extension = path.extname(file).toLowerCase();
    const headers = {
      'content-type': contentTypes.get(extension) ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${directory} at http://${host}:${port}${baseUrl}`);
});
