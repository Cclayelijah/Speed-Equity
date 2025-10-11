import React from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { Box, Button, Paper, Stack, Typography, CircularProgress } from "@mui/material";

interface FileUploadProps {
  projectId?: string;
  onUploadComplete: (result: File | File[] | string | null) => void;
  multiple?: boolean;
  buttonLabel?: string;
  sizeLimitBytes?: number;
}

const LOGO_BUCKET = "project-logos";

const FileUpload: React.FC<FileUploadProps> = ({
  projectId,
  onUploadComplete,
  multiple = false,
  buttonLabel = "Select File",
  sizeLimitBytes,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const uploadToBucket = async (file: File) => {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const objectName = `${projectId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(objectName, file, { upsert: true, contentType: file.type || "image/png", cacheControl: "3600" });
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
    if (!url) throw new Error("No URL resolved");
    return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
  };

  const onDrop = async (accepted: File[]) => {
    setErrorMsg(null);
    if (accepted.length === 0) return;
    const files = multiple ? accepted : [accepted[0]];
    if (sizeLimitBytes) {
      const tooBig = files.find((f) => f.size > sizeLimitBytes);
      if (tooBig) {
        setErrorMsg("File too large.");
        return;
      }
    }

    if (!projectId) {
      onUploadComplete(multiple ? files : files[0]);
      return;
    }

    setLoading(true);
    try {
      const url = await uploadToBucket(files[0]);
      onUploadComplete(url);
    } catch (e: any) {
      console.error("Upload failed", e);
      setErrorMsg(e?.message || "Upload failed");
      onUploadComplete(null);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: { "image/*": [] },
    noClick: true,
    noKeyboard: true,
  });

  return (
    <Paper
      variant="outlined"
      {...getRootProps()}
      className={`transition ${isDragActive ? "ring-1 ring-cyan-400/60 bg-cyan-400/5" : ""}`}
      sx={{ p: 2.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)" }}
    >
      <input {...getInputProps()} />
      {loading ? (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2">Uploading…</Typography>
        </Stack>
      ) : (
        <Stack alignItems="center" spacing={1}>
          <Button variant="outlined" onClick={open}>
            {buttonLabel}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {isDragActive ? "Drop file here…" : "Drag & drop an image here or click Select File"}
          </Typography>
          {errorMsg && (
            <Typography variant="caption" color="error">
              {errorMsg}
            </Typography>
          )}
        </Stack>
      )}
      {isDragActive && (
        <Box className="absolute inset-x-0 h-px pointer-events-none -top-px bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
      )}
    </Paper>
  );
};

export default FileUpload;