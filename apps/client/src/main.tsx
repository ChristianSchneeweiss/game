import { ClerkProvider } from "@clerk/clerk-react";
import * as Sentry from "@sentry/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { registerRecipes } from "../../server/src/lib/superjson-recipes";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

Sentry.init({
  dsn: "https://8f3eeafa92a5c43dca0983588439eb9a@o4510053990334464.ingest.de.sentry.io/4510053992169552",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  enabled: import.meta.env.PROD,
});

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: {},
  defaultPendingComponent: () => <Loader />,
  Wrap: function WrapComponent({ children }) {
    return children;
  },
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

registerRecipes();

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <RouterProvider router={router} />
    </ClerkProvider>,
  );
}
