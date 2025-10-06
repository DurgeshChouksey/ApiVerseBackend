import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient(c: any) {
  return new PrismaClient({
    datasources: {
      db: { url: c.env.DATABASE_URL }
    }
  }).$extends(withAccelerate());
}

export function getPrisma(c: any) {
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient(c);
  }
  return globalThis.prisma;
}
