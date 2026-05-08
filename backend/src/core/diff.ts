import type { Config } from "./types";

export type ChangeType =
  | "ADD_ENTITY"
  | "REMOVE_ENTITY"
  | "ADD_FIELD"
  | "REMOVE_FIELD"
  | "CHANGE_FIELD_TYPE"
  | "ADD_PAGE"
  | "REMOVE_PAGE";

export interface ConfigChange {
  type: ChangeType;
  entity?: string;
  field?: string;
  page?: string;
}

export function diffConfigs(oldConfig: Config, newConfig: Config): ConfigChange[] {
  const changes: ConfigChange[] = [];

  const oldEntityNames = new Set(oldConfig.entities.map((e) => e.name));
  const newEntityNames = new Set(newConfig.entities.map((e) => e.name));

  for (const entity of newConfig.entities) {
    if (!oldEntityNames.has(entity.name)) {
      changes.push({ type: "ADD_ENTITY", entity: entity.name });
    }
  }

  for (const entity of oldConfig.entities) {
    if (!newEntityNames.has(entity.name)) {
      changes.push({ type: "REMOVE_ENTITY", entity: entity.name });
    }
  }

  for (const oldEntity of oldConfig.entities) {
    const newEntity = newConfig.entities.find((e) => e.name === oldEntity.name);
    if (!newEntity) continue;

    const oldFieldIds = new Set(oldEntity.fields.map((f) => f.id));
    const newFieldIds = new Set(newEntity.fields.map((f) => f.id));

    for (const field of newEntity.fields) {
      if (!oldFieldIds.has(field.id)) {
        changes.push({ type: "ADD_FIELD", entity: oldEntity.name, field: field.id });
      }
    }

    for (const field of oldEntity.fields) {
      if (!newFieldIds.has(field.id)) {
        changes.push({ type: "REMOVE_FIELD", entity: oldEntity.name, field: field.id });
      } else {
        const newField = newEntity.fields.find((f) => f.id === field.id);
        if (newField && newField.type !== field.type) {
          changes.push({ type: "CHANGE_FIELD_TYPE", entity: oldEntity.name, field: field.id });
        }
      }
    }
  }

  const oldPagePaths = new Set(oldConfig.pages.map((p) => p.path));
  const newPagePaths = new Set(newConfig.pages.map((p) => p.path));

  for (const page of newConfig.pages) {
    if (!oldPagePaths.has(page.path)) {
      changes.push({ type: "ADD_PAGE", page: page.path });
    }
  }

  for (const page of oldConfig.pages) {
    if (!newPagePaths.has(page.path)) {
      changes.push({ type: "REMOVE_PAGE", page: page.path });
    }
  }

  return changes;
}

export function isBreaking(change: ConfigChange): boolean {
  return (
    change.type === "REMOVE_FIELD" ||
    change.type === "CHANGE_FIELD_TYPE" ||
    change.type === "REMOVE_ENTITY"
  );
}
