import { AuthForm } from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <AuthForm mode="sign-in" />
    </main>
  );
}
