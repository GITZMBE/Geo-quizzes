import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Geo Quizzes</h1>
      <p className="max-w-md text-muted-foreground">
        Test your geography knowledge with interactive map quizzes.
      </p>

      {session?.user ? (
        <Link
          href="/games"
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
        >
          Play Games
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-md border border-border px-6 py-3 font-medium hover:border-primary"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}
