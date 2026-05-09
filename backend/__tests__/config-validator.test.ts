import { describe, it, expect } from 'vitest';
import { validateConfig } from '../src/core/validator';
import { diffConfigs, isBreaking } from '../src/core/diff';
import { normalizeConfig } from '../src/core/normalizer';
import { loadConfig } from '../src/core/configLoader';
import type { Config } from '../src/core/types';

const validConfig: Config = {
  version: '1.0',
  app: { name: 'Test App' },
  auth: { methods: ['email'] },
  entities: [
    {
      name: 'task',
      fields: [
        { id: 'title', type: 'text', label: 'Title', validation: { required: true, maxLength: 200 } },
        { id: 'status', type: 'select', label: 'Status', options: ['open', 'closed'] },
      ],
    },
  ],
  pages: [
    { path: '/tasks', type: 'list', entity: 'task' },
    { path: '/tasks/new', type: 'form', entity: 'task' },
  ],
  features: {
    csv_import: true,
    notifications: { on_create: true },
    notification_recipients: ['admin@test.com'],
  },
};

describe('Config Validator', () => {
  it('should accept a valid config', () => {
    const result = validateConfig(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject config with duplicate entity names', () => {
    const badConfig = {
      ...validConfig,
      entities: [
        ...validConfig.entities,
        { name: 'task', fields: [{ id: 'x', type: 'text' as const }] },
      ],
    };
    const result = validateConfig(badConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.message.includes('Duplicate entity'))).toBe(true);
    }
  });

  it('should reject config with duplicate field IDs', () => {
    const badConfig = {
      ...validConfig,
      entities: [
        {
          name: 'item',
          fields: [
            { id: 'name', type: 'text' as const },
            { id: 'name', type: 'number' as const },
          ],
        },
      ],
    };
    const result = validateConfig(badConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.message.includes('Duplicate field'))).toBe(true);
    }
  });

  it('should reject select fields without options', () => {
    const badConfig = {
      ...validConfig,
      entities: [
        {
          name: 'item',
          fields: [{ id: 'status', type: 'select' as const }],
        },
      ],
    };
    const result = validateConfig(badConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.message.includes('at least one option'))).toBe(true);
    }
  });

  it('should reject pages referencing non-existent entities', () => {
    const badConfig = {
      ...validConfig,
      pages: [{ path: '/nonexistent', type: 'list' as const, entity: 'ghost' }],
    };
    const result = validateConfig(badConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.message.includes("does not exist"))).toBe(true);
    }
  });

  it('should reject duplicate page paths', () => {
    const badConfig = {
      ...validConfig,
      pages: [
        { path: '/dup', type: 'list' as const, entity: 'task' },
        { path: '/dup', type: 'form' as const, entity: 'task' },
      ],
      entities: validConfig.entities,
    };
    const result = validateConfig(badConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.message.includes('Duplicate page'))).toBe(true);
    }
  });

  it('should reject config with missing version field', () => {
    const { version, ...noVersion } = validConfig;
    const result = validateConfig(noVersion);
    expect(result.success).toBe(false);
  });

  it('should reject config with invalid field type', () => {
    const result = validateConfig({
      ...validConfig,
      entities: [{ name: 'x', fields: [{ id: 'f', type: 'invalid' }] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('Config Normalizer', () => {
  it('should inject default labels for missing labels', () => {
    const config: Config = {
      ...validConfig,
      entities: [{
        name: 'item',
        fields: [{ id: 'name', type: 'text' }],
      }],
    };
    const normalized = normalizeConfig(config);
    expect(normalized.entities[0].fields[0].label).toBe('name');
  });

  it('should inject default validation object', () => {
    const config: Config = {
      ...validConfig,
      entities: [{
        name: 'item',
        fields: [{ id: 'name', type: 'text' }],
      }],
    };
    const normalized = normalizeConfig(config);
    expect(normalized.entities[0].fields[0].validation).toBeDefined();
  });
});

const oldConfig: Config = {
  ...validConfig,
  entities: [
    { name: 'task', fields: [{ id: 'title', type: 'text' }] },
    { name: 'project', fields: [{ id: 'name', type: 'text' }] },
  ],
  pages: [
    { path: '/tasks', type: 'list', entity: 'task' },
    { path: '/projects', type: 'list', entity: 'project' },
  ],
};

describe('Config Diff Engine', () => {
  it('should detect added entities', () => {
    const changes = diffConfigs(oldConfig, validConfig);
    expect(changes.some(c => c.type === 'REMOVE_ENTITY' && c.entity === 'project')).toBe(true);
  });

  it('should detect removed entities', () => {
    const newCfg = { ...oldConfig, entities: [...oldConfig.entities, { name: 'bug', fields: [{ id: 'desc', type: 'text' }] }] };
    const changes = diffConfigs(oldConfig, newCfg);
    expect(changes.some(c => c.type === 'ADD_ENTITY' && c.entity === 'bug')).toBe(true);
  });

  it('should detect added fields', () => {
    const newCfg = {
      ...oldConfig,
      entities: [{
        name: 'task',
        fields: [
          { id: 'title', type: 'text' as const },
          { id: 'status', type: 'select' as const, options: ['a'] },
        ],
      }, ...oldConfig.entities.slice(1)],
    };
    const changes = diffConfigs(oldConfig, newCfg);
    expect(changes.some(c => c.type === 'ADD_FIELD' && c.entity === 'task' && c.field === 'status')).toBe(true);
  });

  it('should detect removed fields as breaking', () => {
    const newCfg = {
      ...oldConfig,
      entities: [{ name: 'task', fields: [] }, ...oldConfig.entities.slice(1)],
    };
    const changes = diffConfigs(oldConfig, newCfg);
    const removedField = changes.find(c => c.type === 'REMOVE_FIELD');
    expect(removedField).toBeDefined();
    if (removedField) {
      expect(isBreaking(removedField)).toBe(true);
    }
  });

  it('should detect field type changes as breaking', () => {
    const newCfg = {
      ...oldConfig,
      entities: [{
        name: 'task',
        fields: [{ id: 'title', type: 'number' as const }],
      }, ...oldConfig.entities.slice(1)],
    };
    const changes = diffConfigs(oldConfig, newCfg);
    const typeChange = changes.find(c => c.type === 'CHANGE_FIELD_TYPE');
    expect(typeChange).toBeDefined();
    if (typeChange) {
      expect(isBreaking(typeChange)).toBe(true);
    }
  });

  it('should detect added pages', () => {
    const newCfg = { ...oldConfig, pages: [...oldConfig.pages, { path: '/new-page', type: 'form' as const, entity: 'task' }] };
    const changes = diffConfigs(oldConfig, newCfg);
    expect(changes.some(c => c.type === 'ADD_PAGE')).toBe(true);
  });

  it('should detect removed pages', () => {
    const changes = diffConfigs(oldConfig, validConfig);
    expect(changes.some(c => c.type === 'REMOVE_PAGE')).toBe(true);
  });
});

describe('Config Loader', () => {
  it('should load the demo config file without errors', () => {
    const config = loadConfig('./config/app.json');
    expect(config).toBeTruthy();
    expect(typeof config).toBe('object');
  });

  it('should validate the demo config successfully', () => {
    const raw = loadConfig('./config/app.json');
    const result = validateConfig(raw);
    expect(result.success).toBe(true);
  });
});
