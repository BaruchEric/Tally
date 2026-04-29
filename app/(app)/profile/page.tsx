import type { Metadata } from "next";

import { ProfilePanel } from "@/src/components/profile/ProfilePanel";

export const metadata: Metadata = {
  title: "Profile"
};

export default function ProfilePage() {
  return <ProfilePanel />;
}
