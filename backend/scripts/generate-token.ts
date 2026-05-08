import { SignJWT } from 'jose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const userId = process.argv[2];
  const email = process.argv[3] || 'demo@configforge.dev';

  if (!userId) {
    console.error('Usage: npx tsx scripts/generate-token.ts <user_id> [email]');
    process.exit(1);
  }

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  const token = await new SignJWT({ user_id: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  console.log(token);
}

main().catch(console.error);
