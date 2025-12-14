import { createTRPCRouter } from '@/server/api/trpc'
import { settingsRouter } from '@/server/api/routers/settings'
import { usersRouter } from '@/server/api/routers/users'
import { calculatorRouter } from '@/server/api/routers/calculator'

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  settings: settingsRouter,
  users: usersRouter,
  calculator: calculatorRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
