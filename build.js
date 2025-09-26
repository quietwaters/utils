import { build } from 'esbuild';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function getEntryPoints(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getEntryPoints(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function buildAll() {
  try {
    const entryPoints = await getEntryPoints('src');

    if (entryPoints.length === 0) {
      console.warn('No entry points found in src directory.');
      return;
    }

    console.log('Building files:', entryPoints);

    const sharedOptions = {
      entryPoints,
      outdir: 'dist',
      outbase: 'src',
      platform: 'node',
      target: 'node14.8',
      bundle: false,
      splitting: false,
      treeShaking: true,
      logLevel: 'info',
    };

    await build({
      ...sharedOptions,
      format: 'esm',
      outExtension: { '.js': '.js' },
    });
    console.log('✅ ESM build complete');

    await build({
      ...sharedOptions,
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
    });
    console.log('✅ CommonJS build complete');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
