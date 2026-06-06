#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */
// Quick pre-submission security audit
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const checks = [
  { name: 'debug.json absent', test: () => !existsSync('debug.json') },
  { name: 'package-lock.json absent', test: () => !existsSync('package-lock.json') },
  {
    name: 'No Math.random() in production src',
    test: () => {
      try {
        const result = execSync(
          "grep -rn 'Math.random()' packages/backend/src/ --include='*.ts' | grep -v '.test.'",
          { encoding: 'utf8' },
        ).trim();
        return result === '';
      } catch {
        return true; // grep returns exit code 1 when no matches = good
      }
    },
  },
  {
    name: 'No hardcoded API keys',
    test: () => {
      try {
        const result = execSync(
          "grep -rn 'sk-\\|AIza\\|phx_' packages/ --include='*.ts' | grep -v '.test.' | grep -v 'process.env'",
          { encoding: 'utf8' },
        ).trim();
        return result === '';
      } catch {
        return true;
      }
    },
  },
];

let failed = 0;
checks.forEach(({ name, test }) => {
  const ok = test();
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
});

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
} else {
  console.log('\nAll security checks passed');
}
