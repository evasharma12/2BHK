import React, { useState } from 'react';

const PropertyImages = ({ formData, updateFormData }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    // Create preview URLs
    const newImages = imageFiles.map(file => ({
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    const currentImages = formData.images || [];
    const updatedImages = [...currentImages, ...newImages].slice(0, 10); // Max 10 images
    
    updateFormData('images', updatedImages);
  };

  const removeImage = (index) => {
    const currentImages = formData.images || [];
    const updatedImages = currentImages.filter((_, i) => i !== index);
    updateFormData('images', updatedImages);
  };

  const moveImage = (fromIndex, toIndex) => {
    const currentImages = [...(formData.images || [])];
    const [movedImage] = currentImages.splice(fromIndex, 1);
    currentImages.splice(toIndex, 0, movedImage);
    updateFormData('images', currentImages);
  };

  return (
    <div className="form-section">
      <div className="images-info">
        <p className="field-label">Upload Property Images*</p>
        <p className="field-hint">
          Add up to 10 photos. First image will be the cover photo.
          <br />
          Supported formats: JPG, PNG, JPEG (Max 5MB each)
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`image-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          className="file-input"
          multiple
          accept="image/*"
          onChange={handleFileInput}
        />
        <label htmlFor="file-input" className="upload-label">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <h3>Drop images here or click to upload</h3>
          <p>PNG, JPG up to 5MB each</p>
        </label>
      </div>

      {/* Image Preview Grid */}
      {formData.images && formData.images.length > 0 && (
        <div className="images-preview">
          <div className="preview-grid">
            {formData.images.map((image, index) => (
              <div key={index} className="preview-item">
                {index === 0 && <span className="cover-badge">Cover Photo</span>}
                <img src={image.preview} alt={`Preview ${index + 1}`} className="preview-image" />
                <div className="preview-actions">
                  {index > 0 && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => moveImage(index, index - 1)}
                      title="Move left"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                  )}
                  {index < formData.images.length - 1 && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => moveImage(index, index + 1)}
                      title="Move right"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="action-btn action-btn--delete"
                    onClick={() => removeImage(index)}
                    title="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="images-count">
            {formData.images.length} / 10 images uploaded
          </p>
        </div>
      )}

      {(!formData.images || formData.images.length === 0) && (
        <div className="no-images-message">
          <p>No images uploaded yet. Add at least 3 images for better visibility.</p>
        </div>
      )}
    </div>
  );
};

export default PropertyImages;