import React from "react";
import { FieldProps } from "@/types/config";
import TextInput from "@/components/inputs/TextInput";
import NumberInput from "@/components/inputs/NumberInput";
import SelectInput from "@/components/inputs/SelectInput";
import BooleanInput from "@/components/inputs/BooleanInput";
import DateInput from "@/components/inputs/DateInput";

export const componentRegistry: Record<string, React.ComponentType<FieldProps>> = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  boolean: BooleanInput,
  date: DateInput,
};
