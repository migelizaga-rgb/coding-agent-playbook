#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cli = path.resolve(__dirname, '../bin/agent-handoff');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-handoff-test-'));
function run(...args) {
  return execFileSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8' });
}
try {
  execFileSync('git', ['init', '-b', 'main'], { cwd: repo, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-m', 'initial'], { cwd: repo, stdio: 'ignore' });

  const started = run('start', '--objective', 'Exercise handoff lifecycle', '--task', 'test-task', '--next', 'checkpoint');
  assert.match(started, /Objective: Exercise handoff lifecycle/);
  assert.ok(fs.existsSync(path.join(repo, 'handoff.md')));

  const read = run('read');
  assert.match(read, /Task: test-task/);

  const checkpoint = run('checkpoint', '--milestone', 'verified', '--status', 'checks passed', '--evidence', 'node test-agent-handoff.js', '--next', 'close');
  assert.match(checkpoint, /^docs\/handoff\/checkpoints\//);
  assert.ok(fs.existsSync(path.join(repo, checkpoint.trim())));
  assert.match(run('read'), /Current checkpoint: verified/);

  assert.equal(run('close', '--status', 'closed', '--evidence', 'lifecycle test passed').trim(), 'closed');
  assert.match(run('read'), /Status: closed/);
  assert.match(run('read'), /Current checkpoint: closed/);
  console.log('All 4 handoff lifecycle checks passed');
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
