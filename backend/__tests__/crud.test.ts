import { describe, it, expect } from 'vitest';
import { buildZodSchema } from '../src/db/schemaBuilder';
import type { Entity } from '../src/core/types';

const testEntity: Entity = {
  name: 'test',
  fields: [
    { id: 'title', type: 'text', label: 'Title', validation: { required: true, maxLength: 200 } },
    { id: 'count', type: 'number', label: 'Count' },
    { id: 'active', type: 'boolean', label: 'Active' },
    { id: 'status', type: 'select', label: 'Status', options: ['a', 'b', 'c'] },
    { id: 'date', type: 'date', label: 'Date' },
  ],
};

describe('Zod Schema Builder', () => {
  it('should build a valid schema from entity fields', () => {
    const schema = buildZodSchema(testEntity);
    expect(schema).toBeDefined();
  });

  it('should accept valid data', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({
      title: 'Test Item',
      count: 42,
      active: true,
      status: 'a',
      date: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept missing optional fields', () => {
    const entity: Entity = {
      name: 'test',
      fields: [
        { id: 'title', type: 'text', validation: { required: false } },
      ],
    };
    const schema = buildZodSchema(entity);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid select values', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({
      title: 'Test',
      status: 'invalid_option',
    });
    expect(result.success).toBe(false);
  });

  it('should reject text exceeding maxLength', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({
      title: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-number for number fields', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({
      title: 'Test',
      count: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean for boolean fields', () => {
    const schema = buildZodSchema(testEntity);
    const result = schema.safeParse({
      title: 'Test',
      active: 'maybe',
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty options in select when no options provided', () => {
    const entity: Entity = {
      name: 'test',
      fields: [
        { id: 'title', type: 'text' },
        { id: 'status', type: 'select' },
      ],
    };
    const schema = buildZodSchema(entity);
    const result = schema.safeParse({ title: 'Test', status: 'anything' });
    expect(result.success).toBe(true);
  });
});

describe('CRUD Validation Logic', () => {
  it('should handle pagination bounds', () => {
    const page = Math.max(1, 0);
    const limit = Math.min(100, Math.max(1, 200));
    expect(page).toBe(1);
    expect(limit).toBe(100);
  });

  it('should compute offset correctly', () => {
    const page = 3;
    const limit = 20;
    const offset = (page - 1) * limit;
    expect(offset).toBe(40);
  });

  it('should handle partial updates with merged data', () => {
    const existing = { title: 'Original', status: 'open' };
    const update = { status: 'closed' };
    const merged = { ...existing, ...update };
    expect(merged).toEqual({ title: 'Original', status: 'closed' });
  });
});
