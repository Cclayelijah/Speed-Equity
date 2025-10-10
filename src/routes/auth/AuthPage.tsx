import React, { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { useNavigate } from "react-router-dom";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await signIn(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-md px-4 py-20 mx-auto text-white/80">
        <svg className="w-8 h-8 mb-4 animate-spin text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4 py-12 mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Sign in
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-white/70">
          Use your email to receive a magic link.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="overflow-hidden card">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <div className="p-5 space-y-4 sm:p-6">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
            />
            <p className="help">We’ll send a one-time magic link.</p>
          </div>

          <button
            type="submit"
            className="w-full btn btn-primary"
            disabled={submitting || !email}
          >
            {submitting ? "Sending…" : "Send Magic Link"}
          </button>

          {sent && (
            <div className="px-3 py-2 text-sm border rounded-xl border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              Check your inbox for the magic link.
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthPage;