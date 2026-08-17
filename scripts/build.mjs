// Build: esbuild bundles src/index.ts into lib/index.js (CJS-free ESM,
// externals: all @deepseek-ai/* scopes, zod, and node builtins); tsc emits
// declaration files into lib/types. Mirrors the official dsh-* package layout.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outfile: 'lib/index.js',
  sourcemap: true,
  external: ['@deepseek-ai/*', 'zod', 'node:*'],
  logLevel: 'info',
});

// Web client bundle: CJS + browser, wrapped in the DSH client loader shell
// (window.__ModuleLoader__.load({id, factory})), react external. Mirrors the
// official dsh-* client plugin layout — a bare esbuild transform here crashes
// the web GUI with "loaded without registering".
await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  outfile: 'lib/client.js',
  jsx: 'automatic',
  // Only react stays external (provided by the DSH web shell). schemastery is
  // BUNDLED — DSH web's module table has no factory for it; a require() of
  // @deepseek-ai/schemastery at runtime fails with "missed the module table".
  external: ['react', 'react/jsx-runtime'],
  banner: { js: 'window.__ModuleLoader__.load({\n\tid: "dsh-agent-memory",\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n' },
  footer: { js: '\n\t\treturn module.exports;\n\t}\n});\n' },
  logLevel: 'info',
});

execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { stdio: 'inherit', shell: true });
console.log('build ok');
