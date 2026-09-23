import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = new URL('../docs/prototypes/editor-p0/', import.meta.url);
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('app.ts', root))],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
});
const labBundle = await build({
  entryPoints: [fileURLToPath(new URL('lab-app.ts', root))],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
});
const labTests = await build({
  entryPoints: [fileURLToPath(new URL('lab-browser-tests.ts', root))],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
});
const paths = new Map([
  ['/editor-lab/tests', ['text/html', new URL('lab-tests.html', root)]],
  ['/editor-lab', ['text/html', new URL('lab.html', root)]],
  ['/lab.css', ['text/css', new URL('lab.css', root)]],
  ['/lab/sample.svg', ['image/svg+xml', new URL('lab-sample.svg', root)]],
  ['/lab/sample.webm', ['video/webm', new URL('lab-sample.webm', root)]],
  ['/', ['text/html', new URL('index.html', root)]],
  ['/styles.css', ['text/css', new URL('styles.css', root)]],
  ['/canvas.css', ['text/css', new URL('canvas.css', root)]],
  [
    '/brand.css',
    ['text/css', new URL('../src/web/design-tokens.css', import.meta.url)],
  ],
]);
createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') {
    res.writeHead(405).end();
    return;
  }
  if (req.url === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(bundle.outputFiles[0]!.text);
    return;
  }
  if (req.url === '/lab.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(labBundle.outputFiles[0]!.text);
    return;
  }
  if (req.url === '/lab-tests.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(labTests.outputFiles[0]!.text);
    return;
  }
  const path = paths.get(pathname);
  if (!path) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(path[1] as URL);
    res.writeHead(200, { 'Content-Type': String(path[0]) });
    res.end(data);
  } catch {
    res.writeHead(500).end('Review file unavailable');
  }
}).listen(3002, '127.0.0.1', () =>
  console.log(
    'CometRow Editor Lab: http://127.0.0.1:3002/editor-lab | Browser tests: /editor-lab/tests | Isolated, no production connection.',
  ),
);
