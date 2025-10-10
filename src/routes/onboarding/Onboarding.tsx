import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import AddProject from "../add-project/AddProject";
import { useAuth } from "../../components/AuthProvider";
import toast from "react-hot-toast";
import type { Database } from "../../types/supabase";
import { Plus, Users, Check, ArrowRight } from "lucide-react";

type InviteRow = Database["public"]["Tables"]["project_invitations"]["Row"] & {
  projects?: { name: string | null; logo_url: string | null };
};

type MemberRow = {
  project_id: string;
  projects: { name: string | null; logo_url: string | null; owner_id?: string | null };
};

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<InviteRow[]>([]);
  const [acceptedInvites, setAcceptedInvites] = useState<InviteRow[]>([]);
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberProjects, error: memberErr } = await supabase
      .from("project_members")
      .select("project_id, projects(name, logo_url, owner_id)")
      .eq("user_id", user.id);
    if (memberErr) toast.error(memberErr.message);
    setMemberships((memberProjects as MemberRow[]) ?? []);

    const { data: invites, error: invErr } = await supabase
      .from("project_invitations")
      .select("id, project_id, email, user_id, created_at, accepted_at, projects(name, logo_url)")
      .eq("email", user.email);
    if (invErr && !invErr.message.toLowerCase().includes("does not exist")) {
      toast.error(invErr.message);
    }

    const allInvites = (invites as InviteRow[]) ?? [];
    setPendingInvites(allInvites.filter((i) => !i.accepted_at));
    setAcceptedInvites(allInvites.filter((i) => i.accepted_at));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptInvite = async (invite: InviteRow) => {
    if (!user) return;
    setAccepting(invite.id);
    try {
      const { error: rpcError } = await supabase.rpc("accept_project_invite", { p_invite_id: invite.id });
      if (rpcError) {
        toast.error(rpcError.message);
      } else {
        const { data: existingMember } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("project_id", invite.project_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existingMember) {
          await supabase.from("project_members").insert([{ project_id: invite.project_id, user_id: user.id }]);
        }

        toast.success("Invite accepted!");
        await loadData();
      }
    } finally {
      setAccepting(null);
    }
  };

  const handleGoToProject = (projectId: string) => {
    window.location.href = `/dashboard?project=${projectId}`;
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-3xl px-4 py-6 mx-auto">
      <div className="mb-6 overflow-hidden card">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <div className="p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Welcome
          </div>
          <h1 className="text-3xl font-black tracking-tight">Let’s get started</h1>
          <p className="mt-1 text-white/70">Create a new project or join one you’ve been invited to.</p>

          <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
            <button className="inline-flex items-center gap-2 btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              Create Project
            </button>
            {memberships.length > 0 && (
              <button className="btn btn-outline" onClick={() => (window.location.href = "/dashboard")}>
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="p-5 mb-6 card sm:p-6">
          <AddProject ownerId={user.id} ownerEmail={user.email} />
        </div>
      )}

      <div className="h-px my-6 bg-white/10" />

      {/* Pending Invites */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-white/80" />
        <h2 className="text-xl font-bold">Pending Invitations</h2>
      </div>

      {loading ? (
        <div className="mb-6 space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
      ) : pendingInvites.length === 0 ? (
        <div className="py-3 mb-6 text-center text-white/70">No pending invitations.</div>
      ) : (
        <ul className="mb-6 space-y-2">
          {pendingInvites.map((invite) => (
            <li key={invite.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={invite.projects?.logo_url || ""}
                  fallback={invite.projects?.name?.[0] ?? "?"}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{invite.projects?.name ?? "Project"}</div>
                  <div className="text-xs text-white/60">
                    Invited on {new Date(invite.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-2 btn btn-primary"
                  onClick={() => handleAcceptInvite(invite)}
                  disabled={accepting === invite.id}
                >
                  {accepting === invite.id ? "Accepting…" : "Accept"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Accepted Invites */}
      {acceptedInvites.length > 0 && (
        <>
          <div className="h-px my-6 bg-white/10" />
          <h3 className="mb-3 text-lg font-bold">Recently Accepted</h3>
          <ul className="space-y-2">
            {acceptedInvites.map((invite) => (
              <li key={invite.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={invite.projects?.logo_url || ""}
                    fallback={invite.projects?.name?.[0] ?? "?"}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{invite.projects?.name}</div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                        <Check className="h-3.5 w-3.5" />
                        Accepted
                      </span>
                    </div>
                    <div className="text-xs text-white/60">
                      Accepted {invite.accepted_at ? new Date(invite.accepted_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <button className="btn btn-outline" onClick={() => handleGoToProject(invite.project_id)}>
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="h-px my-6 bg-white/10" />

      {/* Existing Projects */}
      <h2 className="mb-3 text-xl font-bold">Your Projects</h2>
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
      ) : memberships.length === 0 ? (
        <div className="py-3 text-center text-white/70">You are not a member of any projects yet.</div>
      ) : (
        <ul className="space-y-2">
          {memberships.map((m) => (
            <li key={m.project_id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar src={m.projects.logo_url || ""} fallback={m.projects.name?.[0] ?? "?"} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.projects.name}</div>
                  <div className="text-xs text-white/60">Member</div>
                </div>
                <button className="btn btn-outline" onClick={() => handleGoToProject(m.project_id)}>
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && memberships.length === 0 && pendingInvites.length === 0 && !showCreate && (
        <div className="mt-6 text-center">
          <button className="inline-flex items-center gap-2 btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      )}
    </div>
  );
};

function Avatar({ src, fallback, size = 48 }: { src?: string; fallback: string; size?: number }) {
  return src ? (
    <img
      src={src}
      alt=""
      className="object-cover rounded-xl"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="grid font-semibold place-items-center rounded-xl bg-white/10 text-white/80"
      style={{ width: size, height: size }}
    >
      {fallback}
    </div>
  );
}

export default Onboarding;