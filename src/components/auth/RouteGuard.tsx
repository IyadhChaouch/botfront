"use client";

// Route_Guard — the client-side gate that restricts access based on the active
// authentication session (Requirement 5).
//
// It reads `status` and `isAuthenticated` from the Auth_Context and branches on
// the route class:
//   - "protected"   — a Protected_Route that requires an authenticated session.
//   - "public-auth" — the Login_View / Registration_View, reachable only while
//                     unauthenticated.
//
// Behavior:
//   - While the Auth_Context is restoring a session from the Session_Store, the
//     guard shows a loading indicator and renders NO Protected_Route content,
//     so nothing leaks before the session is known (Requirement 5.4). The loader
//     is capped at 5 seconds, after which restoration is treated as failed and
//     the guard proceeds with the (unauthenticated) session (Requirements 5.4,
//     5.5).
//   - For a Protected_Route with no authenticated session, it redirects to the
//     Login_View, preserving the originally requested path INCLUDING its query
//     string in the `next` parameter so it can be restored after login
//     (Requirements 5.1, 5.5).
//   - For a public-auth route with an authenticated session, it redirects to the
//     assistant home route (Requirement 5.3).
//   - An authenticated session on a Protected_Route renders the children, and an
//     unauthenticated session on a public-auth route renders the children
//     (Requirement 5.2).
//
// Redirects are issued synchronously during render (no awaited work), so they
// land within the 100ms bound and the Protected_Route children are never
// committed for an unauthenticated user (Requirements 5.1, 5.2, 5.3).

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/context";

/** The assistant home route — the default authenticated destination. */
const HOME_ROUTE = "/";

/** Maximum time the loader is shown while restoring before giving up. */
const RESTORE_TIMEOUT_MS = 5000;

export type RouteClass = "protected" | "public-auth";

export type RouteGuardProps = {
  /** Whether the wrapped route requires a session ("protected") or must be
   *  reached unauthenticated ("public-auth"). */
  routeClass: RouteClass;
  children: ReactNode;
};

/** Minimal loading indicator shown while the session is being restored. Styled
 *  with semantic Theme_Token utilities; renders no Protected_Route content. */
function RestoreLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-bg text-text-muted"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand"
      />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

function RouteGuardInner({ routeClass, children }: RouteGuardProps) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Cap the restore loader at 5 seconds: once the timer fires we treat the
  // restoration as failed and proceed with the current (unauthenticated)
  // session (Requirements 5.4, 5.5).
  const [restoreTimedOut, setRestoreTimedOut] = useState(false);
  useEffect(() => {
    if (status !== "restoring") {
      return;
    }
    const timer = setTimeout(() => setRestoreTimedOut(true), RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const isRestoring = status === "restoring" && !restoreTimedOut;

  // While restoring (and not timed out), show the loader and never render any
  // Protected_Route content (Requirement 5.4).
  if (isRestoring) {
    return <RestoreLoader />;
  }

  // Protected_Route + no session → redirect to the Login_View, retaining the
  // requested path AND its query string so it can be restored after login
  // (Requirements 5.1, 5.5). Issued synchronously during render for the 100ms
  // bound; children are never committed.
  if (routeClass === "protected" && !isAuthenticated) {
    const query = searchParams?.toString() ?? "";
    const requestedPath = `${pathname ?? HOME_ROUTE}${query ? `?${query}` : ""}`;
    router.replace(`/login?next=${encodeURIComponent(requestedPath)}`);
    return null;
  }

  // Public-auth route + active session → redirect to the assistant home route
  // (Requirement 5.3).
  if (routeClass === "public-auth" && isAuthenticated) {
    router.replace(HOME_ROUTE);
    return null;
  }

  // Authenticated on a Protected_Route, or unauthenticated on a public-auth
  // route → render the requested content (Requirement 5.2).
  return <>{children}</>;
}

// `RouteGuardInner` reads the active URL via `useSearchParams()` (to preserve
// the requested path's query string in the login `next` parameter). In the App
// Router that opts the subtree into client-side rendering, so it must sit under
// a Suspense boundary to avoid a prerender bailout for the pages it wraps. The
// boundary's fallback mirrors the restore loader so nothing leaks while the
// guard resolves.
export function RouteGuard(props: RouteGuardProps) {
  return (
    <Suspense fallback={<RestoreLoader />}>
      <RouteGuardInner {...props} />
    </Suspense>
  );
}

export default RouteGuard;
