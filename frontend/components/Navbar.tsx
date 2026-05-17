"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearPassword } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();

  function handleSignOut() {
    clearPassword();
    router.replace("/login");
  }

  return (
    <nav className="border-b border-slate-800 bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg text-white tracking-tight">
          Job<span className="text-blue-400">Track</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/add" className="hover:text-white transition-colors">Add Job</Link>
          <Link href="/stats" className="hover:text-white transition-colors">Stats</Link>
          <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
          <button onClick={handleSignOut} className="hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
