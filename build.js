import { build } from 'esbuild'
import { readdir } from 'fs/promises'
import { join } from 'path'

async function buildAll() {
  try {
    // Get all JS files in src directory
    const srcFiles = await readdir('src')
    const jsFiles = srcFiles
      .filter(file => file.endsWith('.js'))
      .map(file => `src/${file}`)

    console.log('Building files:', jsFiles)

    // Build ESM version
    await build({
      entryPoints: jsFiles,
      outdir: 'dist',
      format: 'esm',
      outExtension: { '.js': '.js' },
      platform: 'node',
      target: 'node14.8'
    })
    console.log('✅ ESM build complete')

    // Build CommonJS version
    await build({
      entryPoints: jsFiles,
      outdir: 'dist',
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
      platform: 'node',
      target: 'node14.8'
    })
    console.log('✅ CommonJS build complete')

  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

buildAll()