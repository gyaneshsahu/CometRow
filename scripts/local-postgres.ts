import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import EmbeddedPostgres from 'embedded-postgres';

const execute = promisify(execFile);

// The upstream Windows stop uses taskkill, which can hang under restricted
// process permissions. PostgreSQL's own controller performs a graceful stop.
export default class LocalPostgres extends EmbeddedPostgres {
  private windowsStarted = false;
  private windowsProcess?: ChildProcess;

  private async control(args: string[]) {
    const packageName = '@embedded-postgres/windows-x64';
    const binaries = (await import(packageName)) as { pg_ctl: string };
    await execute(binaries.pg_ctl, args, {
      windowsHide: true,
      timeout: 30000,
      env: { ...process.env, LC_MESSAGES: 'C' },
    });
  }

  override async start() {
    if (process.platform !== 'win32') return super.start();
    const packageName = '@embedded-postgres/windows-x64';
    const binaries = (await import(packageName)) as { postgres: string };
    const child = spawn(
      binaries.postgres,
      [
        '-D',
        this.options.databaseDir,
        '-h',
        '127.0.0.1',
        '-p',
        String(this.options.port),
      ],
      { windowsHide: true, env: { ...process.env, LC_MESSAGES: 'C' } },
    );
    this.windowsProcess = child;
    this.windowsStarted = true;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Local PostgreSQL startup timed out')),
        20000,
      );
      child.once('error', () => {
        clearTimeout(timeout);
        reject(new Error('Could not start local PostgreSQL'));
      });
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error('Local PostgreSQL stopped before readiness'));
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        if (
          chunk
            .toString()
            .includes('database system is ready to accept connections')
        ) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.stdout?.resume();
    });
  }

  override async stop() {
    if (process.platform !== 'win32') return super.stop();
    if (!this.windowsStarted) return;
    if (this.windowsProcess?.exitCode !== null) {
      this.windowsStarted = false;
      return;
    }
    await this.control([
      'stop',
      '-D',
      this.options.databaseDir,
      '-m',
      'fast',
      '-w',
      '-t',
      '20',
    ]);
    this.windowsStarted = false;
  }
}
