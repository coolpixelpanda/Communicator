import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#1a1d21]">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h1 className="text-4xl font-bold text-white">Communicator</h1>
          </div>
          <p className="text-sm text-gray-400">Your team collaboration hub</p>
        </div>

        <form
          className="rounded-lg border border-gray-700 bg-[#222529] p-8 shadow-xl"
          onSubmit={handleSubmit}
        >
          <h2 className="mb-6 text-center text-xl font-semibold text-white">
            {isLogin ? "Sign in to your workspace" : "Create your account"}
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-900/40 px-4 py-2.5 text-sm text-red-300 ring-1 ring-red-700/50">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
                className="w-full rounded-md border border-gray-600 bg-[#1a1d21] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                placeholder="your-username"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={6}
                className="w-full rounded-md border border-gray-600 bg-[#1a1d21] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-[#007a5a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="mt-5 text-center text-sm text-gray-400">
            {isLogin ? "New to Communicator? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="font-semibold text-[#1d9bd1] hover:underline"
            >
              {isLogin ? "Create an account" : "Sign in instead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
