#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  PASS: ${label}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${label} - ${err.message}`);
    failed++;
  }
}

function withCoordinator(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-coordinator-test-'));
  process.env.DEPLOY_COORDINATOR_DIR = dir;
  process.env.DEPLOY_BATCH_SIZE = '3';
  process.env.DEPLOY_IDLE_MINUTES = '15';
  process.env.DEPLOY_LOCK_STALE_MINUTES = '60';
  process.env.DEPLOY_COORDINATOR_DEPLOY_CMD = `${process.execPath} -e "process.exit(0)"`;
  delete require.cache[require.resolve('../scripts/deploy-coordinator.js')];
  const coordinator = require('../scripts/deploy-coordinator.js');
  try {
    fn(coordinator, dir);
  } finally {
    try { coordinator.releaseQueueLock(); } catch {}
    try { coordinator.releaseDeployLock(); } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
    delete require.cache[require.resolve('../scripts/deploy-coordinator.js')];
    delete process.env.DEPLOY_COORDINATOR_DIR;
    delete process.env.DEPLOY_BATCH_SIZE;
    delete process.env.DEPLOY_IDLE_MINUTES;
    delete process.env.DEPLOY_LOCK_STALE_MINUTES;
    delete process.env.DEPLOY_COORDINATOR_DEPLOY_CMD;
  }
}

function intent(n, extra = {}) {
  return {
    prUrl: `https://github.com/example/example-repo/pull/${n}`,
    mergeSha: `sha${n}`,
    riskTier: 'low',
    changedFiles: [`docs/${n}.md`],
    source: 'test-agent',
    ...extra,
  };
}

test('enqueue creates a pending deploy intent and deduplicates by merge sha', () => {
  withCoordinator((coordinator) => {
    const first = coordinator.enqueueDeployIntent(intent(1));
    const second = coordinator.enqueueDeployIntent(intent(1, { prUrl: 'https://github.com/example/example-repo/pull/999' }));
    assert.equal(first.action, 'enqueued');
    assert.equal(second.action, 'deduplicated');
    assert.equal(first.intent.id, second.intent.id);
    assert.equal(coordinator.getStatus().pending, 1);
  });
});

test('runOnce waits when neither batch size nor idle window has been reached', () => {
  withCoordinator((coordinator) => {
    coordinator.enqueueDeployIntent(intent(1));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'waiting');
    assert.equal(coordinator.getStatus().pending, 1);
    assert.equal(coordinator.getStatus().completed, 0);
  });
});

test('runOnce deploys immediately when an urgent intent is pending', () => {
  withCoordinator((coordinator) => {
    coordinator.enqueueDeployIntent(intent(1, { urgent: true }));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'deployed');
    assert.equal(result.batch.intents.length, 1);
    assert.equal(coordinator.getStatus().pending, 0);
    assert.equal(coordinator.getStatus().completed, 1);
  });
});

test('runOnce deploys when pending count reaches batch size', () => {
  withCoordinator((coordinator) => {
    coordinator.enqueueDeployIntent(intent(1));
    coordinator.enqueueDeployIntent(intent(2));
    coordinator.enqueueDeployIntent(intent(3));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'deployed');
    assert.equal(result.batch.intents.length, 3);
    assert.equal(coordinator.getStatus().pending, 0);
  });
});

test('runOnce deploys after the idle window', () => {
  withCoordinator((coordinator) => {
    coordinator.enqueueDeployIntent(intent(1, { createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString() }));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'deployed');
    assert.equal(result.reason, 'idle');
  });
});

test('deploy lock prevents concurrent deploy while still allowing enqueue', () => {
  withCoordinator((coordinator) => {
    assert.equal(coordinator.acquireDeployLock({ workerId: 'held-by-test' }), true);
    coordinator.enqueueDeployIntent(intent(1, { urgent: true }));
    coordinator.enqueueDeployIntent(intent(2));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'lockBusy');
    assert.equal(coordinator.getStatus().pending, 2);
  });
});

test('stale deploy lock is reclaimed', () => {
  withCoordinator((coordinator, dir) => {
    fs.writeFileSync(
      path.join(dir, '.deploy.lock'),
      JSON.stringify({ pid: 999999, acquiredAt: new Date(Date.now() - 61 * 60 * 1000).toISOString() }),
    );
    coordinator.enqueueDeployIntent(intent(1, { urgent: true }));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'deployed');
    assert.equal(coordinator.getStatus().completed, 1);
  });
});

test('failed deploy marks the batch failed and releases the lock', () => {
  withCoordinator((coordinator) => {
    process.env.DEPLOY_COORDINATOR_DEPLOY_CMD = `${process.execPath} -e "process.exit(7)"`;
    coordinator.enqueueDeployIntent(intent(1, { urgent: true }));
    const result = coordinator.runOnce();
    assert.equal(result.action, 'failed');
    assert.equal(result.exitCode, 7);
    assert.equal(coordinator.getStatus().failed, 1);
    assert.equal(coordinator.acquireDeployLock({ workerId: 'after-failure' }), true);
  });
});

test('drain dry-run reports eligible batch without mutating queue', () => {
  withCoordinator((coordinator) => {
    coordinator.enqueueDeployIntent(intent(1));
    coordinator.enqueueDeployIntent(intent(2));
    coordinator.enqueueDeployIntent(intent(3));
    const result = coordinator.drain({ dryRun: true });
    assert.equal(result.action, 'wouldDeploy');
    assert.equal(result.batch.intents.length, 3);
    assert.equal(coordinator.getStatus().pending, 3);
  });
});

console.log('\n=== test-deploy-coordinator ===');
if (failed === 0) {
  console.log(`All ${passed} tests passed`);
} else {
  console.log(`${passed} passed, ${failed} FAILED`);
  process.exitCode = 1;
}
