import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, 'fixtures');

export function readFixture<T = Record<string, unknown>>(filename: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, filename), 'utf8')) as T;
}
