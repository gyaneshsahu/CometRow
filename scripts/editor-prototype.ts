import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// A separate loopback-only review server. No production routes or database access.
const root = new URL('../docs/prototypes/campaign-editor/', import.meta.url);
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('app.ts', root))],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
});
const files = new Map<string, [string, string]>([
  ['/', ['text/html', 'index.html']],
  ['/styles.css', ['text/css', 'styles.css']],
  ['/canvas.css', ['text/css', 'canvas.css']],
]);
createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  if (request.method !== 'GET') {
    response.writeHead(405).end();
    return;
  }
  if (request.url === '/app.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.end(bundle.outputFiles[0]!.text);
    return;
  }
  const file = files.get(request.url || '/');
  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    response.writeHead(200, { 'Content-Type': file[0] });
    response.end(await readFile(new URL(file[1], root)));
  } catch {
    response.writeHead(500).end('Prototype file unavailable');
  }
}).listen(3001, '127.0.0.1', () => {
  console.log('CometRow design prototype: http://127.0.0.1:3001');
  console.log(
    'Separate from production. Local browser data only. Ctrl+C to stop.',
  );
});
