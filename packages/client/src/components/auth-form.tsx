import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { userStore } from "@/utils/user-store";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type AuthFormProps = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { setUser } = userStore();
  const { mutateAsync: createUser } = useMutation(
    trpc.createUser.mutationOptions(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const action = async () => {
      const auth = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (auth.error) {
        throw new Error(auth.error.message);
      }

      if (auth.data.user && auth.data.session) {
        setUser({
          id: auth.data.user.id,
          email: auth.data.user.email,
          access_token: auth.data.session.access_token,
        });
        onSuccess?.();
        await createUser();
      }
    };

    toast.promise(action(), {
      loading: "Creating user...",
      success: "User created successfully",
      error: "Failed to create user",
    });
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h2 className="mb-4 text-xl font-bold">
        {isSignUp ? "Create an account" : "Sign in to your account"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none disabled:opacity-50"
        >
          {isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-blue-400 hover:text-blue-300"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
