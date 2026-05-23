const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(name, command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    console.error(`✗ ${name}`);
    process.exit(result.status || 1);
  }

  console.log(`✓ ${name}`);
}

run('validate-project', 'node', ['tools/validate-project.js']);
console.log('全部测试通过');
