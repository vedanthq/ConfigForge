"use client"

import { useSession } from "next-auth/react";

export function useApiToken(): string | undefined {
  const { data: session } = useSession();
  return (session as any)?.accessToken;
}
