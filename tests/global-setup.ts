import { spawn, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';

const PORT = 5173;
let serverProcess: ChildProcess | null = null;

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = createConnection(port, '127.0.0.1');
    conn.on('connect', () => { conn.destroy(); resolve(true); });
    conn.on('error', () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortListening(port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for port ${port} after ${timeoutMs}ms`);
}

export async function setup() {
  if (await isPortListening(PORT)) {
    console.log(`[global-setup] Dev server already running on :${PORT}, reusing it.`);
    return;
  }

  console.log(`[global-setup] Starting dev server on :${PORT}...`);
  serverProcess = spawn('bun', ['run', 'dev'], {
    stdio: process.env.DEBUG_SERVER ? 'inherit' : 'pipe',
    env: { ...process.env },
    detached: false,
  });

  serverProcess.on('error', (err) => {
    throw new Error(`Failed to start dev server: ${err.message}`);
  });

  await waitForPort(PORT);
  console.log(`[global-setup] Dev server ready on :${PORT}`);
}

export async function teardown() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    console.log('[global-setup] Dev server stopped.');
  }
}
