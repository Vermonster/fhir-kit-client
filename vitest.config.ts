import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// MSW's CookieStore accesses `localStorage` to persist cookies between
// requests. In Node 22+, `localStorage` is exposed as a global but requires
// `--localstorage-file` to point at a backing file; without it Node emits a
// warning on every test worker. Providing a temp-dir path satisfies the check.
// See: https://github.com/mswjs/msw/issues/<upstream>
const localStorageFile = join(tmpdir(), 'vitest-localstorage');

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    execArgv: [`--localstorage-file=${localStorageFile}`],
  },
});
