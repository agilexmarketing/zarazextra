import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/component.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: 'dist/component.js',
  sourcemap: false
});
