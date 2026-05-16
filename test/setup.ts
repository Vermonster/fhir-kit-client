import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
