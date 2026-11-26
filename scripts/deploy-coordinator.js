#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function getQueueDir() {
  return process.env.DEPLOY_COORDINATOR_DIR || path.join(__dirname, '..', '.deploy-coordinator');
}

const FILES = {
  pending: () => path.join(getQueueDir(), 'pending.jsonl'),
  running: () => path.join(getQueueDir(), 'running.json'),
  completed: () => path.join(getQueueDir(), 'completed.jsonl'),
  failed: () => path.join(getQueueDir(), 'failed.jsonl'),
  state: () => path.join(getQueueDir(), 'state.json'),
  queueLock: () => path.join(getQueueDir(), '.queue.lock'),
  deployLock: () => path.join(getQueueDir(), '.deploy.lock'),
};

function ensureDir() {
  fs.mkdirSync(getQueueDir(), { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function writeJson(filePath, value) {
  ensureDir();
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
}

function readJsonl(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeJsonl(filePath, rows) {
  ensureDir();
  const tmp = `${filePath}.tmp.${process.pid}`;
  const content = rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function appendJsonl(filePath, row) {
  const rows = readJsonl(filePath);
  rows.push(row);
  writeJsonl(filePath, rows);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isProcessAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function lockAgeMinutes(lock) {
  const t = Date.parse(lock?.acquiredAt || 0);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 60000;
}

function acquireJsonLock(lockPath, { staleMinutes = 10, workerId = 'deploy-coordinator' } = {}) {
  ensureDir();
  for (let i = 0; i < 5; i++) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, workerId, acquiredAt: now() }), { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let lock = null;
      try {
        lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch {
        try { fs.unlinkSync(lockPath); } catch {}
        continue;
      }
      const stale = lockAgeMinutes(lock) >= staleMinutes;
      const dead = lock.pid && !isProcessAlive(lock.pid);
      if (stale || dead) {
        try { fs.unlinkSync(lockPath); } catch {}
        continue;
      }
      sleepSync(50);
    }
  }
  return false;
}

function releaseJsonLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch {}
}

function acquireQueueLock() {
  return acquireJsonLock(FILES.queueLock(), { staleMinutes: 2, workerId: 'deploy-queue' });
}

function releaseQueueLock() {
  releaseJsonLock(FILES.queueLock());
}

function deployLockStaleMinutes() {
  return Number(process.env.DEPLOY_LOCK_STALE_MINUTES || 60);
}

function acquireDeployLock({ workerId = 'deploy-coordinator' } = {}) {
  return acquireJsonLock(FILES.deployLock(), { staleMinutes: deployLockStaleMinutes(), workerId });
}

function releaseDeployLock() {
  releaseJsonLock(FILES.deployLock());
}

function makeDedupeKey(fields) {
  const stable = fields.mergeSha || fields.prUrl;
  return crypto.createHash('sha256').update(String(stable || '')).digest('hex').slice(0, 16);
}

function normalizeIntent(fields) {
  if (!fields.prUrl) throw new Error('prUrl is required');
  if (!fields.mergeSha) throw new Error('mergeSha is required');
  const createdAt = fields.createdAt || now();
  return {
    id: generateId('deploy'),
    createdAt,
    updatedAt: createdAt,
    source: fields.source || 'unknown-agent',
    requestedByAgent: fields.requestedByAgent || fields.source || 'unknown-agent',
    prUrl: fields.prUrl,
    mergeSha: fields.mergeSha,
    riskTier: fields.riskTier || 'unknown',
    urgent: Boolean(fields.urgent),
    changedFiles: Array.isArray(fields.changedFiles) ? fields.changedFiles : [],
    status: 'pending',
    dedupeKey: fields.dedupeKey || makeDedupeKey(fields),
  };
}

function allKnownIntents() {
  const running = readJson(FILES.running(), null);
  const runningIntents = running?.intents || [];
  return [
    ...readJsonl(FILES.pending()),
    ...runningIntents,
    ...readJsonl(FILES.completed()).flatMap((batch) => batch.intents || []),
    ...readJsonl(FILES.failed()).flatMap((batch) => batch.intents || []),
  ];
}

function updateState() {
  const state = getStatus();
  writeJson(FILES.state(), state);
  return state;
}

function enqueueDeployIntent(fields) {
  const intent = normalizeIntent(fields);
  if (!acquireQueueLock()) throw new Error('Could not acquire deploy queue lock');
  try {
    const dupe = allKnownIntents().find((item) => item.dedupeKey === intent.dedupeKey);
    if (dupe) return { action: 'deduplicated', intent: dupe };
    appendJsonl(FILES.pending(), intent);
    updateState();
    return { action: 'enqueued', intent };
  } finally {
    releaseQueueLock();
  }
}

function sortPending(rows) {
  return rows.slice().sort((a, b) => {
    if (Boolean(a.urgent) !== Boolean(b.urgent)) return a.urgent ? -1 : 1;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

function batchSize() {
  return Math.max(1, Number(process.env.DEPLOY_BATCH_SIZE || 3));
}

function idleMinutes() {
  return Math.max(0, Number(process.env.DEPLOY_IDLE_MINUTES || 15));
}

function selectEligibleBatch(pendingRows) {
  const pending = sortPending(pendingRows);
  if (!pending.length) return { eligible: false, reason: 'empty', intents: [] };
  const urgent = pending.some((row) => row.urgent);
  const oldestAge = (Date.now() - Date.parse(pending[0].createdAt)) / 60000;
  const countReady = pending.length >= batchSize();
  const idleReady = oldestAge >= idleMinutes();
  if (!urgent && !countReady && !idleReady) {
    return { eligible: false, reason: 'threshold', intents: [] };
  }
  const reason = urgent ? 'urgent' : countReady ? 'batch-size' : 'idle';
  return { eligible: true, reason, intents: pending };
}

function makeBatch(intents, reason) {
  const startedAt = now();
  return {
    id: generateId('deploybatch'),
    status: 'running',
    reason,
    startedAt,
    updatedAt: startedAt,
    workerId: process.env.DEPLOY_COORDINATOR_WORKER_ID || `pid-${process.pid}`,
    intents: intents.map((intent) => ({ ...intent, status: 'running', updatedAt: startedAt })),
    result: { exitCode: null, stdoutTail: null, stderrTail: null, command: deployCommand() },
  };
}

function deployCommand() {
  return process.env.DEPLOY_COORDINATOR_DEPLOY_CMD || 'bash scripts/agent-deploy-compact.sh';
}

function tail(text, max = 2000) {
  const value = String(text || '');
  return value.length > max ? value.slice(-max) : value;
}

function runDeployCommand(command) {
  return spawnSync(command, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    shell: true,
    timeout: Number(process.env.DEPLOY_COORDINATOR_TIMEOUT_MS || 45 * 60 * 1000),
  });
}

function claimEligibleBatch() {
  if (!acquireQueueLock()) return { action: 'queueLockBusy' };
  try {
    const pending = readJsonl(FILES.pending());
    const selected = selectEligibleBatch(pending);
    if (!selected.eligible) return { action: 'waiting', reason: selected.reason };
    const selectedKeys = new Set(selected.intents.map((intent) => intent.id));
    const rest = pending.filter((intent) => !selectedKeys.has(intent.id));
    const batch = makeBatch(selected.intents, selected.reason);
    writeJsonl(FILES.pending(), rest);
    writeJson(FILES.running(), batch);
    updateState();
    return { action: 'claimed', batch, reason: selected.reason };
  } finally {
    releaseQueueLock();
  }
}

function completeRunningBatch(batch, result) {
  if (!acquireQueueLock()) throw new Error('Could not acquire deploy queue lock');
  try {
    const completedAt = now();
    const completed = {
      ...batch,
      status: result.ok ? 'completed' : 'failed',
      completedAt,
      updatedAt: completedAt,
      intents: batch.intents.map((intent) => ({ ...intent, status: result.ok ? 'completed' : 'failed', updatedAt: completedAt })),
      result: {
        ...batch.result,
        exitCode: result.exitCode,
        stdoutTail: tail(result.stdout),
        stderrTail: tail(result.stderr),
        command: result.command,
      },
    };
    appendJsonl(result.ok ? FILES.completed() : FILES.failed(), completed);
    try { fs.unlinkSync(FILES.running()); } catch {}
    updateState();
    return completed;
  } finally {
    releaseQueueLock();
  }
}

function runOnce() {
  const preview = selectEligibleBatch(readJsonl(FILES.pending()));
  if (!preview.eligible) return { action: 'waiting', reason: preview.reason };
  if (!acquireDeployLock({ workerId: process.env.DEPLOY_COORDINATOR_WORKER_ID || 'deploy-coordinator' })) {
    return { action: 'lockBusy' };
  }
  try {
    const claimed = claimEligibleBatch();
    if (claimed.action !== 'claimed') return claimed.action === 'waiting' ? claimed : { action: claimed.action };
    const command = deployCommand();
    const proc = runDeployCommand(command);
    const exitCode = typeof proc.status === 'number' ? proc.status : 1;
    const completed = completeRunningBatch(claimed.batch, {
      ok: exitCode === 0,
      exitCode,
      stdout: proc.stdout,
      stderr: proc.stderr || proc.error?.message || '',
      command,
    });
    if (exitCode === 0) return { action: 'deployed', reason: claimed.reason, batch: completed, exitCode };
    return { action: 'failed', reason: claimed.reason, batch: completed, exitCode };
  } finally {
    releaseDeployLock();
  }
}

function getStatus() {
  const running = readJson(FILES.running(), null);
  let deployLock = null;
  try { deployLock = JSON.parse(fs.readFileSync(FILES.deployLock(), 'utf8')); } catch {}
  return {
    pending: readJsonl(FILES.pending()).length,
    running: running ? 1 : 0,
    completed: readJsonl(FILES.completed()).length,
    failed: readJsonl(FILES.failed()).length,
    deployLock: Boolean(deployLock),
    updatedAt: now(),
  };
}

function drain({ dryRun = false } = {}) {
  const selected = selectEligibleBatch(readJsonl(FILES.pending()));
  if (!selected.eligible) return { action: 'waiting', reason: selected.reason };
  if (dryRun) {
    return {
      action: 'wouldDeploy',
      reason: selected.reason,
      batch: { intents: selected.intents },
    };
  }
  return runOnce();
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--urgent') {
      opts.urgent = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg.startsWith('--')) {
      opts[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = rest[++i];
    }
  }
  return { cmd, opts };
}

function main(argv = process.argv.slice(2)) {
  const { cmd, opts } = parseArgs(argv);
  let result;
  if (cmd === 'enqueue') {
    result = enqueueDeployIntent({
      prUrl: opts.pr,
      mergeSha: opts.mergeSha,
      riskTier: opts.risk,
      source: opts.source,
      urgent: opts.urgent,
      changedFiles: opts.changedFiles ? opts.changedFiles.split(',').filter(Boolean) : [],
    });
  } else if (cmd === 'run-once') {
    result = runOnce();
  } else if (cmd === 'status') {
    result = getStatus();
  } else if (cmd === 'drain') {
    result = drain({ dryRun: opts.dryRun });
  } else {
    console.error('usage: deploy-coordinator.js enqueue --pr <url> --merge-sha <sha> --risk <tier> [--urgent] | run-once | status --json | drain --dry-run');
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) main();

module.exports = {
  FILES,
  getQueueDir,
  enqueueDeployIntent,
  runOnce,
  getStatus,
  drain,
  acquireQueueLock,
  releaseQueueLock,
  acquireDeployLock,
  releaseDeployLock,
  selectEligibleBatch,
};
