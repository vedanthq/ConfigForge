import React from "react";
import { FieldProps } from "@/types/config";
import { componentRegistry } from "./componentRegistry";
import UnknownField from "@/components/inputs/UnknownField";

export function renderField(props: FieldProps): React.ReactElement {
  const Component = componentRegistry[props.type];
  if (!Component) {
    return (
      <UnknownField
        id={props.id}
        type={props.type}
        label={props.label}
        value={props.value}
        onChange={props.onChange}
      />
    );
  }
  return <Component {...props} />;
}
