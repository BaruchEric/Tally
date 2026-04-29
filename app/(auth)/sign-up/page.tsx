import type { Metadata } from "next";

import { AuthForm } from "@/src/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign up"
};

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
