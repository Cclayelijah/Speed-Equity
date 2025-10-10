import React from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';

interface FileUploadProps {
  projectId?: string;
  onUploadComplete: (result: File | File[] | string | null) => void;
  multiple?: boolean;
  buttonLabel?: string;
  sizeLimitBytes?: number;
  variant?: 'text' | 'outlined' | 'contained'; // kept for API compatibility (unused)
}

const LOGO_BUCKET = 'project-logos';

const FileUpload: React.FC<FileUploadProps> = ({
  projectId,
  onUploadComplete,
  multiple = false,
  buttonLabel = 'Select File',
  sizeLimitBytes,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const uploadToBucket = async (file: File) => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const objectName = `${projectId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(objectName, file, {
        upsert: true,
        contentType: file.type || 'image/png',
        cacheControl: '3600',
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

    if (!url) throw new Error('No URL resolved');
    return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  };

  const onDrop = async (accepted: File[]) => {
    setErrorMsg(null);
    if (accepted.length === 0) return;

    const files = multiple ? accepted : [accepted[0]];
    if (sizeLimitBytes) {
      const tooBig = files.find(f => f.size > sizeLimitBytes);
      if (tooBig) {
        setErrorMsg('File too large.');
        return;
      }
    }

    // If no projectId yet, just return the File(s) (selection mode)
    if (!projectId) {
      onUploadComplete(multiple ? files : files[0]);
      return;
    }

    setLoading(true);
    try {
      // Upload only first file for logo
      const url = await uploadToBucket(files[0]);
      onUploadComplete(url);
    } catch (e: any) {
      console.error('Upload failed', e);
      setErrorMsg(e?.message || 'Upload failed');
      onUploadComplete(null);
    } finally {
      setLoading(false);
    }
  };

  // Prevent double file dialog: use noClick + manual button open()
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: { 'image/*': [] },
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div
      {...getRootProps()}
      className={[
        'relative p-4 text-center rounded-2xl border-2 border-dashed transition',
        'bg-white/[0.03] hover:bg-white/5',
        isDragActive ? 'border-cyan-400/60 bg-cyan-400/5' : 'border-white/15',
      ].join(' ')}
    >
      {/* Focus ring for accessibility when container is focused programmatically */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-0 focus-within:ring-2 focus-within:ring-fuchsia-400/30" />

      <input {...getInputProps()} />

      {/* Upload state */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <svg className="w-5 h-5 animate-spin text-white/80" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
          <span className="text-sm text-white/80">Uploading…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <button type="button" onClick={open} className="btn btn-outline">
            {buttonLabel}
          </button>
          <p className="mt-2 text-xs text-white/60">
            {isDragActive ? 'Drop file here…' : 'Drag & drop an image here or click Select File'}
          </p>
          {errorMsg && <p className="mt-2 text-xs text-red-300">{errorMsg}</p>}
        </div>
      )}

      {/* Decorative accent on active drag */}
      {isDragActive && (
        <div className="absolute inset-x-0 h-px pointer-events-none -top-px bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
      )}
    </div>
  );
};

export default FileUpload;