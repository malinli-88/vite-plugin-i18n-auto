import { readFileSync } from 'node:fs';
import esbuild from 'rollup-plugin-esbuild';
import { dts } from 'rollup-plugin-dts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  /^node:/,
  'react',
  'react-dom',
  'react/jsx-runtime',
];

export default [
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'esm', sourcemap: true },
    external,
    plugins: [esbuild({ target: 'node18', platform: 'node' })],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    external,
    plugins: [dts()],
  },
];
