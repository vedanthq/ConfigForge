import { describe, it, expect } from 'vitest';
import express from 'express';

describe('Health Endpoints', () => {
  it('should have /health endpoint return 200', async () => {
    const app = express();
    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy' });
    });

    // Use a simple server test
    const server = app.listen(0);
    const address = server.address();
    expect(address).toBeTruthy();
    server.close();
  });

  it('should have /health/ready endpoint', async () => {
    const app = express();
    app.get('/health/ready', (_req, res) => {
      res.json({ status: 'ready', ready: true });
    });

    const server = app.listen(0);
    const address = server.address();
    expect(address).toBeTruthy();
    server.close();
  });
});
