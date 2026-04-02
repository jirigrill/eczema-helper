import { spawn, type ChildProcess } from 'node:child_process';

const BASE_URL = `http://localhost:5173`;
let serverProcess: ChildProcess | null = null;

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null && serverProcess?.exitCode !== undefined) {
      throw new Error(`Dev server exited with code ${serverProcess.exitCode} before becoming ready`);
    }
    if (await isServerUp()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for dev server at ${BASE_URL} after ${timeoutMs}ms`);
}

export async function setup() {
  if (await isServerUp()) {
    console.log(`[global-setup] Dev server already running at ${BASE_URL}, reusing it.`);
    return;
  }

  console.log(`[global-setup] Starting dev server at ${BASE_URL}...`);
  serverProcess = spawn('bun', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Surface server errors so CI logs show why startup failed
  serverProcess.stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  if (process.env.DEBUG_SERVER) {
    serverProcess.stdout?.on('data', (chunk: Buffer) => process.stdout.write(chunk));
  }

  await waitForServer();
  console.log(`[global-setup] Dev server ready at ${BASE_URL}`);
}

export async function teardown() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    console.log('[global-setup] Dev server stopped.');
  }
}
