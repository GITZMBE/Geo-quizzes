import { AuthForm } from "@/components/AuthForm";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Sign up</h1>
      <AuthForm mode="sign-up" />
    </main>
  );
}
