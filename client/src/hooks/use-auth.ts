import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, isSignedIn: isSignedInAuth } = useClerkAuth();

  const isAuthenticated = !!(isSignedIn && user);

  const logout = () => {
    void signOut();
  };

  return {
    user: user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? undefined,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          profileImageUrl: user.imageUrl ?? undefined,
        }
      : null,
    isLoading: !isLoaded,
    isAuthenticated,
    logout,
    isLoggingOut: false,
  };
}
