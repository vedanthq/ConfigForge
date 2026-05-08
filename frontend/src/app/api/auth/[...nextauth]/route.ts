import NextAuth from "next-auth";
import { buildAuthOptions } from "@/lib/auth";

export async function GET(req: Request, ctx: { params: Promise<any> }): Promise<Response> {
  const options = await buildAuthOptions();
  const handler = NextAuth(options);
  return handler(req, ctx) as Promise<Response>;
}

export async function POST(req: Request, ctx: { params: Promise<any> }): Promise<Response> {
  const options = await buildAuthOptions();
  const handler = NextAuth(options);
  return handler(req, ctx) as Promise<Response>;
}
