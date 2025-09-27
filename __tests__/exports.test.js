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
      expect(srcDirectories).toContain(moduleName);
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

  test('exports count should match src directories count plus main entry', () => {
    const exportKeys = Object.keys(packageJson.exports);
    // Should have one export for each src directory plus the main entry "."
    expect(exportKeys).toHaveLength(srcDirectories.length + 1);
  });
});