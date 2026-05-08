"use client"

import React, { createContext, useContext, ReactNode } from "react";
import { RuntimeConfig } from "@/types/config";
import { useRuntimeConfig } from "@/hooks/useRuntimeConfig";

interface ConfigContextValue {
  config: RuntimeConfig | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  error: null,
  loading: true,
  refresh: () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { config, error, loading, refresh } = useRuntimeConfig();
  return (
    <ConfigContext.Provider value={{ config, error, loading, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  return useContext(ConfigContext);
}
