import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/worker.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: 'dist/worker.js',
  sourcemap: false
});
