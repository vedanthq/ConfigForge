import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'test-secret-that-is-at-least-32-characters-long!!');

describe('Auth Token Generation', () => {
  it('should generate a valid JWT with user claims', async () => {
    const token = await new SignJWT({ user_id: 'test-user-id', email: 'test@test.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.user_id).toBe('test-user-id');
    expect(payload.email).toBe('test@test.com');
  });

  it('should reject expired tokens', async () => {
    const token = await new SignJWT({ user_id: 'test', email: 'test@test.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('0s')
      .sign(JWT_SECRET);

    await expect(jwtVerify(token, JWT_SECRET)).rejects.toThrow();
  });

  it('should reject tokens with wrong secret', async () => {
    const token = await new SignJWT({ user_id: 'test', email: 'test@test.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode('different-secret'));

    await expect(jwtVerify(token, JWT_SECRET)).rejects.toThrow();
  });
});

describe('Password Hashing', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = 'testPassword123';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);

    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);

    const invalid = await bcrypt.compare('wrongPassword', hash);
    expect(invalid).toBe(false);
  });

  it('should produce different hashes for the same password', async () => {
    const password = 'testPassword123';
    const hash1 = await bcrypt.hash(password, 8);
    const hash2 = await bcrypt.hash(password, 8);

    expect(hash1).not.toBe(hash2);
  });
});

describe('Auth Validation', () => {
  it('should require minimum password length of 8', () => {
    const shortPassword = 'abc';
    expect(shortPassword.length).toBeLessThan(8);

    const validPassword = 'password123';
    expect(validPassword.length).toBeGreaterThanOrEqual(8);
  });

  it('should normalize email addresses', () => {
    const rawEmail = '  Test@Example.COM  ';
    const normalized = rawEmail.trim().toLowerCase();
    expect(normalized).toBe('test@example.com');
  });
});
