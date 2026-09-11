if (!process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim()) {
  throw new Error(
    "Set VITE_CLERK_PUBLISHABLE_KEY in the game Worker's build variables before deploying. Runtime variables are not available to the client build.",
  );
}
