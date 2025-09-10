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
            url: "prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19BUjYyVlJ6aGF2aVBiREx3aU1iSm8iLCJhcGlfa2V5IjoiMDFLNEREV0JDSEg1MVNSWlNYMEVHTjg0WFMiLCJ0ZW5hbnRfaWQiOiJkYmJiNDAyMWU3ZmQ3YTA2MGIxNjlmN2Q3ZjgxY2JhMTQwMTQwMzMyODZkMmIzYTRjM2QzMTBiZGYwNmJkMDcwIiwiaW50ZXJuYWxfc2VjcmV0IjoiNzYzN2QzOGMtZmIwOC00ODFlLTg0MDQtMTEwMTQ5MTIxZjRmIn0.z6k80stKA-AO8Krr3Mmzkwke9FIDxMBm4EFKFGmkBvE"
            }
        }
    }).$extends(withAccelerate());
  }
  return globalThis.prisma as PrismaClient
}
