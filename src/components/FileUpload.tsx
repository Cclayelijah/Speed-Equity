import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';

interface FileUploadProps {
  projectId: string;
  onUploadComplete: (logoUrl: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ projectId, onUploadComplete }) => {
  const [loading, setLoading] = React.useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setLoading(true);
    const file = acceptedFiles[0];
    const filePath = `project-logos/${projectId}.png`;

    const { error } = await supabase.storage.from('project-logos').upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      console.error('Error uploading file:', error);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('project-logos').getPublicUrl(filePath);
    if (publicUrlData?.publicUrl) {
      onUploadComplete(publicUrlData.publicUrl);
    }
    setLoading(false);
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false });

  return (
    <div {...getRootProps()} style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center' }}>
      <input {...getInputProps()} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Button variant="contained" color="primary">
          Upload Project Logo
        </Button>
      )}
      <p>Drag & drop or click to select a logo file</p>
    </div>
  );
};

export default FileUpload;