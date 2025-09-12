// src/prisma/client.ts
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

// creating a single global cleint
// Instead of creating a new one on each request
declare global {
  var prisma: PrismaClient | undefined
}

export function getPrisma(c: any) {
  // Create a Prisma client using the database URL from env
  if (!globalThis.prisma) {
    // creating only first time because later each request will resue the global client.
    globalThis.prisma = new PrismaClient({
        datasources: {
            db: {
            url: c.env.DATABASE_URL,
            }
        }
    }).$extends(withAccelerate());
  }
  return globalThis.prisma as PrismaClient
}
