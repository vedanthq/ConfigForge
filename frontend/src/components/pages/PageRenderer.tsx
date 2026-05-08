"use client"

import React from "react";
import { RuntimeConfig, RuntimePage } from "@/types/config";
import FormPage from "@/components/pages/FormPage";
import ListPage from "@/components/pages/ListPage";
import DetailPage from "@/components/pages/DetailPage";
import DashboardPage from "@/components/pages/DashboardPage";
import ErrorPage from "@/components/pages/ErrorPage";

interface PageRendererProps {
  page: RuntimePage;
  config: RuntimeConfig;
  params: Record<string, string>;
}

export default function PageRenderer({ page, config, params }: PageRendererProps) {
  const entity = page.entity
    ? config.entities.find((e) => e.name === page.entity)
    : undefined;

  switch (page.type) {
    case "form":
      if (!entity)
        return <ErrorPage message={`Entity "${page.entity}" not found`} />;
      return <FormPage entity={entity} />;
    case "list":
      if (!entity)
        return <ErrorPage message={`Entity "${page.entity}" not found`} />;
      return <ListPage entity={entity} />;
    case "detail":
      if (!entity)
        return <ErrorPage message={`Entity "${page.entity}" not found`} />;
      return <DetailPage entity={entity} id={params.id} />;
    case "dashboard":
      return <DashboardPage config={config} />;
    default:
      return <ErrorPage message={`Unsupported page type: ${page.type}`} />;
  }
}
