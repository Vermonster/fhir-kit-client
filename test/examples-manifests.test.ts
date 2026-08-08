import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const examplePackagePaths = [
  'examples/cds-hooks/package.json',
  'examples/confidential-smart-ehr/package.json',
  'examples/public-smart-ehr/package.json',
  'examples/smart-standalone/package.json',
];

function readPackageJson(relativePath: string) {
  const packageJsonPath = join(import.meta.dirname, '..', relativePath);
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
}

describe('example package manifests', () => {
  it('require a patched Express version and no direct body-parser dependency', () => {
    for (const packagePath of examplePackagePaths) {
      const packageJson = readPackageJson(packagePath);

      expect(packageJson.dependencies?.express).toBe('^4.21.2');
      expect(packageJson.dependencies?.['body-parser']).toBeUndefined();
    }
  });
});
