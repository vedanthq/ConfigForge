import type { Config, RuntimeConfig } from "./types";

export function normalizeConfig(config: Config): RuntimeConfig {
  return {
    ...config,
    entities: config.entities.map((e) => ({
      ...e,
      fields: e.fields.map((f) => ({
        ...f,
        label: f.label ?? f.id,
        validation: f.validation ?? {},
      })),
    })),
    features: {
      ...config.features,
      notifications: config.features.notifications ?? {},
      notification_recipients: config.features.notification_recipients ?? [],
    },
  };
}
