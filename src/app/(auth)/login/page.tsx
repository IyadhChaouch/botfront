// Login route (`/login`) — a Public_Route in the `(auth)` route group.
//
// Renders the Login_View (`LoginForm`) inside the split-screen `AuthShell`
// (teal brand panel + form column), wrapped by the public-auth Route_Guard so
// an already-authenticated visitor is redirected to the assistant home and only
// unauthenticated visitors see the form (Requirement 1.1, 5.3). All styling is
// on semantic Theme_Token utilities so the view re-themes across light/dark
// Color_Modes and mirrors for Arabic via the inherited `dir` attribute (R9.5).

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function LoginPage() {
  return (
    <RouteGuard routeClass="public-auth">
      <AuthShell variant="login">
        <LoginForm />
      </AuthShell>
    </RouteGuard>
  );
}
