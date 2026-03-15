import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user from Clerk
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.auth ?? {};

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const clerkUser = await clerkClient.users.getUser(userId);

      const user = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
        createdAt: clerkUser.createdAt,
        updatedAt: clerkUser.updatedAt,
      };

      res.json(user);
    } catch (error) {
      console.error("Error fetching user from Clerk:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
