// Voice mode route (`/voice`) — a Protected_Route.
//
// Renders the immersive voice glyph view behind the protected Route_Guard so it
// requires a session, mirroring the assistant home. The recognized question is
// handed back to `/` via sessionStorage and sent through the normal chat path.

import { VoiceMode } from "@/components/voice/VoiceMode";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function VoicePage() {
  return (
    <RouteGuard routeClass="protected">
      <VoiceMode />
    </RouteGuard>
  );
}
