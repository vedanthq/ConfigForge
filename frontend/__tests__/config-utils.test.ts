import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Config Utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should use default API_URL when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { API_URL } = await import('@/lib/config');
    expect(API_URL).toBe('http://localhost:4000');
  });

  it('should use env var API_URL when set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    const { API_URL } = await import('@/lib/config');
    expect(API_URL).toBe('https://api.example.com');
  });

  it('should use default APP_ID when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_ID;
    const { APP_ID } = await import('@/lib/config');
    expect(APP_ID).toBe('');
  });

  it('apiConfig should have correct structure', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://test:4000';
    process.env.NEXT_PUBLIC_APP_ID = 'test-app-id';
    const { apiConfig } = await import('@/lib/config');
    expect(apiConfig.baseUrl).toBe('http://test:4000');
    expect(apiConfig.appId).toBe('test-app-id');
    expect(apiConfig.defaultHeaders['Content-Type']).toBe('application/json');
  });
});

describe('API Helper', () => {
  it('should build config with auth token', async () => {
    const { getApiConfig } = await import('@/lib/api');
    const config = getApiConfig('test-token');
    const headers = config.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should build config without token', async () => {
    const { getApiConfig } = await import('@/lib/api');
    const config = getApiConfig();
    const headers = config.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });
});
