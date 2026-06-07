// The package root is "type": "module" (so the ESM-based tests work), but the
// build emits CommonJS (base tsconfig module=commonjs). Marking the dist folder
// as CommonJS lets the API (type: commonjs) `require('@workshop/shared')` and
// lets the web bundler consume it without ESM/CJS mismatch.
const fs = require('fs');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/package.json', JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log('postbuild: wrote dist/package.json (type: commonjs)');
