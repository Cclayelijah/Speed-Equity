import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { Database } from "@/types/supabase";
import FileUpload from "@/components/FileUpload";
import { useNavigate } from "react-router-dom";
import { Grid, Typography } from "@mui/material";
import {
  Container,
  Card,
  CardContent,
  Button,
  TextField,
} from "@/components/ui/brand";

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
    const { data: signed, error: signedErr } = await supabase
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

  if (input.owner_email) {
    const { error: memErr } = await supabase
      .from("project_members")
      .upsert(
        [{ project_id: projectId, user_id: input.owner_id, email: input.owner_email }],
        { onConflict: "project_id,user_id" }
      );
    if (memErr) toast.error(memErr.message);
  }

  if (input.logoFile) {
    try {
      const logoUrl = await uploadLogo(projectId, input.logoFile);
      const { error: updErr } = await supabase.from("projects").update({ logo_url: logoUrl }).eq("id", projectId);
      if (updErr) toast.error("Failed to attach logo");
    } catch (e: any) {
      toast.error(`Logo upload failed: ${e.message || "error"}`);
    }
  }

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
  const [form, setForm] = useState({
    name: "",
    initialValuation: "",
    workHoursRemaining: "",
    logoFile: null as File | null,
    logoPreview: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleLogoPick = (file: File | null) => {
    setForm((f) => {
      if (f.logoPreview) URL.revokeObjectURL(f.logoPreview);
      if (!file) return { ...f, logoFile: null, logoPreview: null };
      if (file.size > MAX_LOGO_SIZE) {
        toast.error("Image too large (>5MB)");
        return { ...f };
      }
      return { ...f, logoFile: file, logoPreview: URL.createObjectURL(file) };
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
        initialValuation:
          form.initialValuation === "" ? null : Number(form.initialValuation),
        workHoursRemaining:
          form.workHoursRemaining === "" ? null : Number(form.workHoursRemaining),
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
    <Container maxWidth="sm">
      <Card accent className="mb-4">
        <CardContent>
          <Typography variant="h4" fontWeight={900}>
            Create a New Project
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set the basics now. You can change details later in Settings.
          </Typography>
        </CardContent>
      </Card>

      <Card component="form" onSubmit={handleSubmit} accent>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Project Name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Speed Equity OS"
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Initial Valuation (optional)"
                type="number"
                value={form.initialValuation}
                onChange={(e) => handleChange("initialValuation", e.target.value)}
                placeholder="e.g. 2500000"
                disabled={loading}
                helperText="USD"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Work Hours Remaining (optional)"
                type="number"
                value={form.workHoursRemaining}
                onChange={(e) => handleChange("workHoursRemaining", e.target.value)}
                placeholder="e.g. 1200"
                disabled={loading}
                helperText="Estimated engineering hours to completion"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Project Logo (optional)
              </Typography>
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
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={form.logoPreview}
                    alt="Logo preview"
                    className="object-cover h-14 w-14 rounded-xl"
                  />
                  {form.logoFile && (
                    <Typography variant="caption" color="text.secondary" className="truncate">
                      {form.logoFile.name}
                    </Typography>
                  )}
                </div>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" tone="primary" fullWidth disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AddProject;
