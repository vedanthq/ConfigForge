"use client"

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { RuntimeConfig } from "@/types/config";
import PageRenderer from "@/components/pages/PageRenderer";
import ErrorPage from "@/components/pages/ErrorPage";

interface PageRouterProps {
  config: RuntimeConfig;
}

export default function PageRouter({ config }: PageRouterProps) {
  const pathname = usePathname();

  const result = useMemo(() => {
    if (!pathname) return { page: null, params: {} as Record<string, string> };

    const exactPage = config.pages.find((p) => p.path === pathname);
    if (exactPage) return { page: exactPage, params: {} as Record<string, string> };

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 2) {
      const [entityName, id] = segments;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        const detailPage = config.pages.find(
          (p) => p.type === "detail" && p.entity === entityName
        );
        if (detailPage) {
          return { page: detailPage, params: { id } };
        }
      }
    }

    return { page: null, params: {} as Record<string, string> };
  }, [config, pathname]);

  if (!result.page) {
    return <ErrorPage message="Page not found" />;
  }

  return <PageRenderer page={result.page} config={config} params={result.params} />;
}
