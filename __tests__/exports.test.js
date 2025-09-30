const fs = require('fs');
const path = require('path');

describe('Package exports configuration', () => {
  let packageJson;
  let srcDirectories;

  beforeAll(() => {
    // Read package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Get all directories in src
    const srcPath = path.join(__dirname, '..', 'src');
    const srcEntries = fs.readdirSync(srcPath, { withFileTypes: true });
    srcDirectories = srcEntries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  });

  test('should have exports field in package.json', () => {
    expect(packageJson.exports).toBeDefined();
    expect(typeof packageJson.exports).toBe('object');
  });

  test('should have main entry export', () => {
    expect(packageJson.exports['.']).toBe('./src/index.js');
  });

  test('should have exports for all src subdirectories', () => {
    srcDirectories.forEach(dirName => {
      const exportKey = `./${dirName}`;
      const expectedPath = `./src/${dirName}/index.js`;

      expect(packageJson.exports[exportKey]).toBeDefined();
      expect(packageJson.exports[exportKey]).toBe(expectedPath);
    });
  });

  test('should not have extra exports that do not correspond to src directories', () => {
    const exportKeys = Object.keys(packageJson.exports);
    const moduleExportKeys = exportKeys.filter(key => key !== '.');

    moduleExportKeys.forEach(exportKey => {
      const moduleName = exportKey.replace('./', '');
      // For nested paths (e.g., "tencentcloud/cloudfunction"), check the root directory exists
      const rootModule = moduleName.split('/')[0];
      expect(srcDirectories).toContain(rootModule);
    });
  });

  test('should have valid file paths for all exports', () => {
    Object.entries(packageJson.exports).forEach(([exportKey, exportPath]) => {
      const fullPath = path.join(__dirname, '..', exportPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  test('each exported module should have valid module.exports', () => {
    srcDirectories.forEach(dirName => {
      const modulePath = path.join(__dirname, '..', 'src', dirName, 'index.js');
      expect(() => {
        const moduleContent = require(modulePath);
        expect(moduleContent).toBeDefined();
        expect(typeof moduleContent).toBe('object');
      }).not.toThrow();
    });
  });

  test('exports count should be at least src directories count plus main entry', () => {
    const exportKeys = Object.keys(packageJson.exports);
    // Should have at least one export for each src directory plus the main entry "."
    // (may have more due to sub-path exports like tencentcloud/cloudfunction)
    expect(exportKeys.length).toBeGreaterThanOrEqual(srcDirectories.length + 1);
  });

  test('all exports should be requireable', () => {
    Object.entries(packageJson.exports).forEach(([exportKey, exportPath]) => {
      const fullPath = path.join(__dirname, '..', exportPath);

      expect(() => {
        const moduleContent = require(fullPath);
        expect(moduleContent).toBeDefined();
        expect(typeof moduleContent).toBe('object');

        // All exports should have at least one property
        const exportedKeys = Object.keys(moduleContent);
        expect(exportedKeys.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  test('package.json exports should work with require', () => {
    const Module = require('module');
    const packageName = packageJson.name;
    const projectRoot = path.join(__dirname, '..');

    Object.keys(packageJson.exports).forEach(exportKey => {
      // Build the import path as users would use it
      const importPath = exportKey === '.'
        ? packageName
        : `${packageName}${exportKey.substring(1)}`; // Remove leading '.'

      // Get the expected file path from exports
      const expectedPath = path.resolve(projectRoot, packageJson.exports[exportKey]);

      // Test that the file exists and can be required
      expect(() => {
        const moduleContent = require(expectedPath);
        expect(moduleContent).toBeDefined();
        expect(typeof moduleContent).toBe('object');

        // Verify it exports something useful
        const exportedKeys = Object.keys(moduleContent);
        expect(exportedKeys.length).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  test('exports can be imported using documented patterns', () => {
    const projectRoot = path.join(__dirname, '..');

    // Test main entry
    expect(() => {
      const mainModule = require(path.join(projectRoot, packageJson.exports['.']));
      expect(mainModule).toBeDefined();
      expect(Object.keys(mainModule).length).toBeGreaterThan(0);
    }).not.toThrow();

    // Test submodule entries
    expect(() => {
      const logModule = require(path.join(projectRoot, packageJson.exports['./log']));
      expect(logModule.log).toBeDefined();
    }).not.toThrow();

    // Test nested entries
    expect(() => {
      const cloudfunctionModule = require(path.join(projectRoot, packageJson.exports['./tencentcloud/cloudfunction']));
      expect(cloudfunctionModule.entranceWrapper).toBeDefined();
    }).not.toThrow();

    expect(() => {
      const documentdbModule = require(path.join(projectRoot, packageJson.exports['./tencentcloud/documentdb']));
      expect(documentdbModule.createCollection).toBeDefined();
    }).not.toThrow();
  });
});