// Placeholder for commands whose prerequisites are not available yet.
// Usage: node scripts/blocked.mjs <cmd> <T-id> "<reason>"
const [cmd = 'command', taskId = 'T-???', reason = 'prerequisite unavailable'] =
  process.argv.slice(2);

console.error(`BLOCKED: ${cmd} needs ${taskId} (${reason}); see docs/progress.md`);
process.exit(1);
