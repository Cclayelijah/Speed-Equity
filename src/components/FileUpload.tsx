import React from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { Typography, CircularProgress } from "@mui/material";
import { Card, CardContent, Button } from "@/components/ui/brand";

interface FileUploadProps {
  projectId?: string;
  onUploadComplete: (result: File | File[] | string | null) => void;
  multiple?: boolean;
  buttonLabel?: string;
  sizeLimitBytes?: number;
  bucket?: string; // optional override (defaults to project-logos)
}

const DEFAULT_BUCKET = "project-logos";

export default function FileUpload({
  projectId,
  onUploadComplete,
  multiple = false,
  buttonLabel = "Select File",
  sizeLimitBytes,
  bucket = DEFAULT_BUCKET,
}: FileUploadProps) {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isHover, setHover] = React.useState(false);

  const uploadToBucket = async (file: File) => {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const objectName = `${projectId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(objectName, file, {
        upsert: true,
        contentType: file.type || "image/png",
        cacheControl: "3600",
      });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectName);
    let url = pub?.publicUrl || null;

    if (!url) {
      const { data: signed, error: signedErr } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(objectName, 60 * 60 * 24 * 30);
      if (signedErr) throw signedErr;
      url = signed?.signedUrl || null;
    }
    if (!url) throw new Error("Could not resolve uploaded file URL");
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

    // If no projectId, return files to caller
    if (!projectId) {
      onUploadComplete(multiple ? files : files[0]);
      return;
    }

    setLoading(true);
    try {
      const url = await uploadToBucket(files[0]);
      onUploadComplete(url);
    } catch (e: any) {
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

  const ring = isDragActive || isHover;

  return (
    <Card
      {...getRootProps()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={[
        "relative cursor-pointer border-dashed",
        ring ? "ring-1 ring-cyan-400/60 bg-cyan-400/5" : "",
      ].join(" ")}
      variant="outlined"
    >
      {/* Accent top bar while active */}
      {ring && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />}

      <CardContent className="grid gap-2 py-6 place-items-center">
        <input {...getInputProps()} />

        {loading ? (
          <div className="flex items-center gap-2">
            <CircularProgress size={18} />
            <Typography variant="body2">Uploading…</Typography>
          </div>
        ) : (
          <>
            <Button tone="outline" onClick={open} className="px-4">
              {buttonLabel}
            </Button>
            <Typography variant="caption" color="text.secondary" className="text-center">
              {isDragActive ? "Drop file here…" : "Drag & drop an image here or click Select File"}
            </Typography>
            {errorMsg && (
              <Typography variant="caption" color="error">
                {errorMsg}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
