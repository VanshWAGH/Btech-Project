import type { Express, RequestHandler } from "express";
import { ClerkExpressWithAuth, ClerkExpressRequireAuth } from "@clerk/express";

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  app.use(
    ClerkExpressWithAuth({
      // Uses CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY from the environment
    }),
  );
}

export const isAuthenticated: RequestHandler = ClerkExpressRequireAuth();
