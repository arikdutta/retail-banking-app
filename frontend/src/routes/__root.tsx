import {
  createRootRoute,
  HeadContent,
  Scripts,
  Outlet,
  redirect,
  useRouterState,
  ErrorComponent,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/app-config";
import { initErrorReporter, report, setReporterUser } from "@/lib/error-reporter";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { getSessionUser, PUBLIC_PATHS } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import globalsCss from "~/styles/globals.css?url";

export type { SessionUser };

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));
    if (isPublic) return { user: null as SessionUser | null };
    console.log("[root] beforeLoad: checking session for", location.pathname);
    try {
      const user = await getSessionUser();
      if (!user) {
        console.log("[root] beforeLoad: no user, redirecting to /login");
        throw redirect({ to: "/login" });
      }
      console.log("[root] beforeLoad: authenticated as", user.email);
      return { user };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err; // re-throw redirect
      console.error("[root] beforeLoad: unexpected error", err);
      throw err;
    }
  },
  // Render nothing while auth check is in flight — prevents flash of protected content
  pendingMs: 0,
  pendingComponent: () => null,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/favicon.ico?v=2" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  errorComponent: ({ error }) => {
    console.error("[root] errorComponent:", error);
    const stack = error instanceof Error ? error.stack : undefined;
    report({
      bugType: "JsError",
      message: error instanceof Error ? error.message : String(error),
      ...(stack ? { stackTrace: stack } : {}),
    });
    return <ErrorComponent error={error} />;
  },
  component: () => {
    const { user } = Route.useRouteContext();
    useEffect(() => {
      setReporterUser(user?.email ?? null);
    }, [user?.email]);
    return <Outlet />;
  },
  shellComponent: RootDocument,
});

function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    initErrorReporter();
  }, []);
  // TODO. Improve this, short fix for /demo .
  const noPad = pathname.startsWith("/demo");
  return <div className={noPad ? "" : "pb-20 md:pb-0"}>{children}</div>;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // vite-plugin-pwa can't auto-inject registration (no index.html under
  // TanStack Start/Nitro), so register the generated worker ourselves.
  // registerType "autoUpdate" makes the SW self-updating (skipWaiting +
  // clientsClaim), so a plain register call is all that's needed.
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[pwa] service worker registration failed", err);
      });
    }
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>
              <div data-print-hide>
                <Nav />
              </div>
              <MainContent>{children}</MainContent>
              <Toaster richColors />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
        {/* {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />} */}
        <Scripts />
      </body>
    </html>
  );
}
