#!/usr/bin/env node
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PB_BIN = path.resolve('pocketbase', 'pocketbase');
const PORT = process.env.PB_PORT || '8090';
const HOST = process.env.PB_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('PocketBase did not become healthy in time');
}

async function main() {
  // verify pocketbase binary exists
  try { await access(PB_BIN); } catch { 
    console.error(`PocketBase binary not found at ${PB_BIN}`);
    process.exit(1);
  }

  const tempRoot = tmpdir();
  const dataDir = await mkdtemp(path.join(tempRoot, 'pb-e2e-'));

  console.log(`[pb-test] Data dir: ${dataDir}`);

  const pb = spawn(PB_BIN, ['serve', '--http', `${HOST}:${PORT}`, '--dir', dataDir], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  pb.stdout.on('data', (d) => process.stdout.write(`[pb] ${d}`));
  pb.stderr.on('data', (d) => process.stderr.write(`[pb] ${d}`));

  const cleanup = async () => {
    console.log('\n[pb-test] Shutting down PocketBase...');
    if (!pb.killed) pb.kill('SIGTERM');
    try { await rm(dataDir, { recursive: true, force: true }); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // wait for PB health
  await waitForHealth();
  console.log('[pb-test] PocketBase is healthy');

  // run migrations
  await new Promise((resolve, reject) => {
    const mig = spawn(PB_BIN, ['migrate', 'up', '--dir', 'pocketbase/pb_migrations', '--url', BASE_URL], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    mig.stdout.on('data', (d) => process.stdout.write(`[pb-migrate] ${d}`));
    mig.stderr.on('data', (d) => process.stderr.write(`[pb-migrate] ${d}`));
    mig.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`migrate exited ${code}`)));
  });

  console.log('[pb-test] Migrations applied. Ready.');
  // keep process alive while PB runs
}

main().catch((err) => {
  console.error('[pb-test] Failed to start:', err);
  process.exit(1);
});

