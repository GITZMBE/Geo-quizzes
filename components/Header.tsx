"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Link href="/" className="font-bold">
        Geo Quizzes
      </Link>

      {status === "loading" ? null : session?.user ? (
        <div className="flex items-center gap-4 text-sm">
          <Link href="/games" className="text-muted-foreground hover:text-foreground">
            Play Games
          </Link>
          <span className="text-muted-foreground">
            {session.user.name ?? session.user.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-muted-foreground underline hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  );
}
