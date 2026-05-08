export interface RuntimeField {
  id: string;
  type: string;
  label: string;
  options?: string[];
}

export interface RuntimeEntity {
  name: string;
  label: string;
  fields: RuntimeField[];
}

export interface RuntimePage {
  path: string;
  type: string;
  entity?: string;
  label?: string;
}

export interface RuntimeConfig {
  entities: RuntimeEntity[];
  pages: RuntimePage[];
}

export interface FieldProps {
  id: string;
  type: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  options?: string[];
}
