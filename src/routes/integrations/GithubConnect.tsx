import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";

type CommitRow = Database["public"]["Tables"]["github_commits"]["Row"];

const GithubConnect: React.FC = () => {
  const [repoFullName, setRepoFullName] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [commits, setCommits] = useState<CommitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("github_commits")
      .select("*")
      .order("committed_at", { ascending: false })
      .limit(10);
    if (error) console.error("Error fetching commits:", error);
    setCommits((data as CommitRow[]) || []);
    setLoading(false);
  }, []);

  const handleSaveRepo = async () => {
    if (!repoFullName.trim() || !webhookSecret.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("github_repos")
      .insert([{ repo_full_name: repoFullName.trim(), webhook_secret: webhookSecret.trim() }]);
    setSaving(false);
    if (error) {
      console.error("Error saving repository:", error);
      return;
    }
    setRepoFullName("");
    setWebhookSecret("");
    fetchCommits();
  };

  useEffect(() => {
    fetchCommits();
  }, [fetchCommits]);

  return (
    <div className="w-full max-w-3xl px-4 py-6 mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Integrations
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">GitHub Integration</h1>
        <p className="mt-1 text-white/70">Connect a repository to sync recent commits into your dashboard.</p>
      </div>

      {/* Connect form */}
      <div className="overflow-hidden card">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <div className="p-5 space-y-4 sm:p-6">
          <div>
            <label className="label">Repository Full Name</label>
            <input
              className="input"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              placeholder="owner/repo (e.g. vercel/next.js)"
            />
            <p className="help">Use the format owner/repo.</p>
          </div>
          <div>
            <label className="label">Webhook Secret</label>
            <input
              className="input"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="A secret string used to verify GitHub webhooks"
            />
            <p className="help">You’ll configure this same secret on your GitHub webhook.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="btn btn-outline"
              type="button"
              onClick={fetchCommits}
              disabled={loading}
              title="Refresh commits"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSaveRepo}
              disabled={saving || !repoFullName.trim() || !webhookSecret.trim()}
            >
              {saving ? "Saving…" : "Save Repository"}
            </button>
          </div>
        </div>
      </div>

      {/* Recent commits */}
      <div className="p-5 mt-6 card sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Commits</h2>
          <span className="text-xs text-white/60">{loading ? "Loading…" : `${commits.length} loaded`}</span>
        </div>

        {loading && commits.length === 0 ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mb-2 h-[54px] rounded-xl bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : commits.length === 0 ? (
          <div className="py-6 text-center text-white/70">No commits found.</div>
        ) : (
          <ul className="space-y-2">
            {commits.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="grid text-sm font-semibold h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                    {(c.author_name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold truncate">{c.message || "(no message)"}</div>
                      <span className="text-xs text-white/60">
                        {c.committed_at ? new Date(c.committed_at as any).toLocaleString() : ""}
                      </span>
                    </div>
                    {c.author_name && (
                      <div className="mt-0.5 text-xs text-white/60">by {c.author_name}</div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GithubConnect;