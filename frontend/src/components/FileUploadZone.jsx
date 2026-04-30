import { useState, useRef } from 'react';
import { HiOutlineCloudUpload } from 'react-icons/hi';
import './FileUploadZone.css';

export default function FileUploadZone({ onUpload, uploading = false }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onUpload(files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div
      className={`upload-zone ${dragOver ? 'upload-zone-active' : ''} ${uploading ? 'upload-zone-uploading' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <HiOutlineCloudUpload className="upload-icon" />
      {uploading ? (
        <p className="upload-text">Uploading...</p>
      ) : (
        <>
          <p className="upload-text">
            Drop file here or <span className="upload-browse">browse</span>
          </p>
          <p className="upload-hint">Any file type supported</p>
        </>
      )}
    </div>
  );
}
