export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export type ValidationResult<T> =
  | { success: true; data: T; warnings: string[] }
  | { success: false; errors: ValidationError[] };

export type FieldType = "text" | "number" | "date" | "select" | "boolean";

export type PageType = "list" | "form" | "detail" | "dashboard";

export interface Field {
  id: string;
  type: FieldType;
  label?: string;
  options?: string[];
  validation?: {
    required?: boolean;
    maxLength?: number;
  };
}

export interface Entity {
  name: string;
  fields: Field[];
}

export interface Page {
  path: string;
  type: PageType;
  entity: string;
}

export interface Features {
  csv_import: boolean;
  notifications: {
    on_create?: boolean;
    on_update?: boolean;
    on_delete?: boolean;
  };
  notification_recipients?: string[];
}

export interface Config {
  version: string;
  app: { name: string };
  auth: { methods: ("email" | "google")[] };
  entities: Entity[];
  pages: Page[];
  features: Features;
}

export type RuntimeConfig = Config;

export interface EventPayload {
  type: string;
  entity?: string;
  field?: string;
  page?: string;
  timestamp: string;
}
