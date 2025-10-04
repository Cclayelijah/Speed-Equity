import React from 'react';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';

interface FileUploadProps {
  projectId?: string;
  onUploadComplete: (result: File | File[] | string | null) => void;
  multiple?: boolean;
  buttonLabel?: string;
  sizeLimitBytes?: number;
  variant?: 'text' | 'outlined' | 'contained';
}

const LOGO_BUCKET = 'project-logos';

const FileUpload: React.FC<FileUploadProps> = ({
  projectId,
  onUploadComplete,
  multiple = false,
  buttonLabel = 'Select File',
  sizeLimitBytes,
  variant = 'outlined',
}) => {
  const [loading, setLoading] = React.useState(false);

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
    if (accepted.length === 0) return;
    const files = multiple ? accepted : [accepted[0]];

    if (sizeLimitBytes) {
      const tooBig = files.find(f => f.size > sizeLimitBytes);
      if (tooBig) {
        console.error('File too large');
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
    } catch (e) {
      console.error('Upload failed', e);
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
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'divider',
        p: 2,
        textAlign: 'center',
        borderRadius: 2,
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      <input {...getInputProps()} />
      {loading ? (
        <CircularProgress size={28} />
      ) : (
        <Button variant={variant} size="small" onClick={open}>
          {buttonLabel}
        </Button>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
        {isDragActive ? 'Drop file here…' : 'Drag & drop or click the button'}
      </Typography>
    </Box>
  );
};

export default FileUpload;