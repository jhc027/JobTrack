"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getPassword } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/login" && !getPassword()) {
      router.replace("/login");
    }
  }, [pathname, router]);

  // Always render children — server and client both agree on this.
  // Unauthenticated users get redirected via useEffect, and any API
  // call without a password returns 401 which also redirects to /login.
  return <>{children}</>;
}
