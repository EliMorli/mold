import { useState, useRef } from "react";
import { Camera, Upload, X, ZoomIn, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function PhotoGallery({ photos = [], onPhotosChange, readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        // For demo mode, create a local blob URL
        if (typeof base44.integrations?.Core?.UploadFile !== 'function') {
          return URL.createObjectURL(file);
        }
        const { data } = await base44.integrations.Core.UploadFile({ file });
        return data.file_url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newPhotos = [...photos, ...uploadedUrls.map(url => ({
        url,
        timestamp: new Date().toISOString(),
        caption: ''
      }))];
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Error uploading photos:', error);
      // Fallback for demo mode - create blob URLs
      const blobUrls = files.map(file => ({
        url: URL.createObjectURL(file),
        timestamp: new Date().toISOString(),
        caption: ''
      }));
      onPhotosChange([...photos, ...blobUrls]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const openLightbox = (index) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateLightbox = (direction) => {
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      setCurrentPhotoIndex(newIndex);
    }
  };

  const downloadPhoto = (photo) => {
    const url = typeof photo === 'string' ? photo : photo.url;
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPhotoUrl = (photo) => {
    return typeof photo === 'string' ? photo : photo.url;
  };

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 text-blue-600"
          >
            <Upload className="w-4 h-4" />
            Upload Photos
          </Button>

          <Button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 text-green-600"
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>

          {uploading && (
            <span className="text-sm text-blue-600 flex items-center">
              Uploading...
            </span>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={getPhotoUrl(photo)}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openLightbox(index)}
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>

                <button
                  type="button"
                  onClick={() => downloadPhoto(photo)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Timestamp Badge */}
              {photo.timestamp && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                  {new Date(photo.timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No photos attached</p>
          {!readOnly && (
            <p className="text-sm text-gray-400 mt-1">
              Upload photos or take a picture using your camera
            </p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                disabled={currentPhotoIndex === 0}
                className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 z-10"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                disabled={currentPhotoIndex === photos.length - 1}
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 z-10"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={getPhotoUrl(photos[currentPhotoIndex])}
            alt={`Photo ${currentPhotoIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
            {currentPhotoIndex + 1} / {photos.length}
          </div>

          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); downloadPhoto(photos[currentPhotoIndex]); }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
