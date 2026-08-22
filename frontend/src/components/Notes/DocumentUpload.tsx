import { useState, useRef } from "react";
import { uploadDocument } from "../../api/client";
import { useNavigate } from "react-router-dom";

interface DocumentUploadProps {
  onUploadStart: () => void;
  onUploadEnd: () => void;
  onError: (error: string) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

export function DocumentUpload({ onUploadStart, onUploadEnd, onError }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(`Unsupported file type: ${file.type}. Allowed: PDF, PNG, JPEG`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError("File too large. Maximum size: 10 MB");
      return;
    }

    setUploading(true);
    setFileName(file.name);
    onUploadStart();

    try {
      const result = await uploadDocument(file);
      navigate(`/notes/${result.note_id}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
      onUploadEnd();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="document-upload">
      <div
        className={`upload-zone ${dragActive ? "drag-active" : ""} ${uploading ? "uploading" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpeg,.jpg"
          onChange={handleInputChange}
          style={{ display: "none" }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="spinner" />
            <p>Extracting text from {fileName}...</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📄</div>
            <p className="upload-title">
              Drop a PDF or image here, or <span className="upload-link">click to browse</span>
            </p>
            <p className="upload-hint">
              Supports .pdf, .png, .jpeg (max 10 MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
