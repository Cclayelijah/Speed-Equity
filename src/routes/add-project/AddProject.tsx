import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import type { Database } from "../../types/supabase";
import FileUpload from "../../components/FileUpload";
import { useNavigate } from "react-router-dom";

type ProjectsTable = Database["public"]["Tables"]["projects"]["Row"];
const LOGO_BUCKET = "project-logos";
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

async function uploadLogo(projectId: string, file: File) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const objectName = `${projectId}.${ext}`;
  const { error: upErr } = await supabase.storage.from(LOGO_BUCKET).upload(objectName, file, {
    upsert: true,
    contentType: file.type || "image/png",
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(objectName);
  let url = pub?.publicUrl || null;

  if (!url) {
    const { data: signed, error: signedErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(objectName, 60 * 60 * 24 * 30);
    if (signedErr) throw signedErr;
    url = signed?.signedUrl || null;
  }
  if (!url) throw new Error("Could not resolve logo URL");
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

interface CreateProjectInput {
  name: string;
  owner_id: string;
  owner_email: string | null;
  initialValuation?: number | null;
  workHoursRemaining?: number | null;
  logoFile?: File | null;
}

export async function createProject(input: CreateProjectInput) {
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert([{ name: input.name, owner_id: input.owner_id }])
    .select()
    .single();
  if (projErr) throw projErr;

  const projectId = project.id as string;

  // Ensure membership
  if (input.owner_email) {
    const { error: memErr } = await supabase
      .from("project_members")
      .upsert(
        [
          {
            project_id: projectId,
            user_id: input.owner_id,
            email: input.owner_email,
          },
        ],
        { onConflict: "project_id,user_id" }
      );
    if (memErr) toast.error(memErr.message);
  }

  // Logo
  if (input.logoFile) {
    try {
      const logoUrl = await uploadLogo(projectId, input.logoFile);
      const { error: updErr } = await supabase.from("projects").update({ logo_url: logoUrl }).eq("id", projectId);
      if (updErr) toast.error("Failed to attach logo");
    } catch (e: any) {
      toast.error(`Logo upload failed: ${e.message || "error"}`);
    }
  }

  // Optional initial projection
  if (
    (input.initialValuation != null && !isNaN(input.initialValuation)) ||
    (input.workHoursRemaining != null && !isNaN(input.workHoursRemaining))
  ) {
    const { error: projErrRpc } = await supabase.rpc("set_active_projection", {
      p_project_id: projectId,
      p_valuation: input.initialValuation != null ? input.initialValuation : 0,
      p_work_hours_until_completion: input.workHoursRemaining != null ? input.workHoursRemaining : 0,
      p_effective_from: new Date().toISOString().slice(0, 10),
      p_projection_id: undefined,
    });
    if (projErrRpc) toast.error("Initial projection failed");
  }

  return project as ProjectsTable;
}

const AddProject = ({ ownerId, ownerEmail }: { ownerId: string; ownerEmail: string | null }) => {
  const [form, setForm] = useState<{
    name: string;
    initialValuation: string;
    workHoursRemaining: string;
    logoFile: File | null;
    logoPreview: string | null;
  }>({
    name: "",
    initialValuation: "",
    workHoursRemaining: "",
    logoFile: null,
    logoPreview: null,
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleLogoPick = (file: File | null) => {
    setForm((f) => {
      if (f.logoPreview) URL.revokeObjectURL(f.logoPreview);
      if (!file) return { ...f, logoFile: null, logoPreview: null };
      if (file.size > MAX_LOGO_SIZE) {
        toast.error("Image too large (>5MB)");
        return { ...f };
      }
      return {
        ...f,
        logoFile: file,
        logoPreview: URL.createObjectURL(file),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name required");
      return;
    }
    setLoading(true);
    try {
      await createProject({
        name: form.name.trim(),
        owner_id: ownerId,
        owner_email: ownerEmail,
        initialValuation: form.initialValuation === "" ? null : Number(form.initialValuation),
        workHoursRemaining: form.workHoursRemaining === "" ? null : Number(form.workHoursRemaining),
        logoFile: form.logoFile || undefined,
      });
      toast.success("Project created!");
      navigate("/dashboard");
      if (form.logoPreview) URL.revokeObjectURL(form.logoPreview);
      setForm({
        name: "",
        initialValuation: "",
        workHoursRemaining: "",
        logoFile: null,
        logoPreview: null,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl px-4 py-8 mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          New project
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Create a New Project</h1>
        <p className="mt-1 text-white/70">Set the basics now. You can change details later in Settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="overflow-hidden card">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
        <div className="p-5 space-y-4 sm:p-6">
          {/* Project Name */}
          <div>
            <label className="label">Project Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Sweat Equity OS"
              required
              disabled={loading}
            />
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Initial Valuation (optional)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input"
                value={form.initialValuation}
                onChange={(e) => handleChange("initialValuation", e.target.value)}
                placeholder="e.g. 2500000"
                disabled={loading}
              />
              <p className="help">USD</p>
            </div>
            <div>
              <label className="label">Work Hours Remaining (optional)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                value={form.workHoursRemaining}
                onChange={(e) => handleChange("workHoursRemaining", e.target.value)}
                placeholder="e.g. 1200"
                disabled={loading}
              />
              <p className="help">Estimated engineering hours to completion</p>
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="label">Project Logo (optional)</label>
            <FileUpload
              onUploadComplete={(payload: any) => {
                const file = Array.isArray(payload) ? payload[0] : payload;
                if (file instanceof File) {
                  handleLogoPick(file);
                } else if (typeof file === "string") {
                  handleLogoPick(null);
                  setForm((f) => ({ ...f, logoPreview: file, logoFile: null }));
                } else {
                  toast.error("Unsupported upload result");
                }
              }}
            />
            {form.logoPreview && (
              <div className="flex items-center gap-3 mt-3">
                <img
                  src={form.logoPreview}
                  alt="Logo preview"
                  className="object-cover rounded-xl ring-1 ring-white/15 bg-white/5"
                  style={{ width: 56, height: 56 }}
                />
                {form.logoFile && (
                  <span className="text-xs truncate text-white/70">{form.logoFile.name}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button type="submit" className="w-full btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddProject;