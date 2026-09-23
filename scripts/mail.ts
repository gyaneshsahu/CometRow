import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('.local/mail');
try {
  const files = (await readdir(directory))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .slice(-10);
  if (!files.length) console.log('No local emails yet.');
  for (const file of files) {
    const message = JSON.parse(
      await readFile(resolve(directory, file), 'utf8'),
    ) as { to: string; subject: string; text: string };
    if (process.argv[2] && message.to !== process.argv[2]) continue;
    console.log(`\nTo: ${message.to}\n${message.subject}\n${message.text}`);
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT')
    console.log('No local emails yet.');
  else throw error;
}
