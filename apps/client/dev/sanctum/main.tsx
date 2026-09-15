import { createRoot } from "react-dom/client";
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { TRPCProvider } from "@/utils/trpc-provider";
import Loader from "@/components/loader";
import { installTransport } from "./transport";
import { Workbench } from "./workbench";

installTransport();
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: {},
  defaultPendingComponent: Loader,
});
createRoot(document.getElementById("root")!).render(
  <TRPCProvider>
    {new URLSearchParams(location.search).get("view") === "components" ? (
      <Workbench />
    ) : (
      <RouterProvider router={router} />
    )}
  </TRPCProvider>,
);
