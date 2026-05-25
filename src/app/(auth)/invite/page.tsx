import { Suspense } from "react";
import { InviteLanding } from "./invite-landing";

export default function InvitePage() {
  return (
    <Suspense>
      <InviteLanding />
    </Suspense>
  );
}
