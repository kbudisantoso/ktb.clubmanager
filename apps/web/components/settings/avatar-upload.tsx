'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAvatarUpload, useRemoveAvatar } from '@/hooks/use-profile';
import { getCroppedImg } from '@/lib/crop-image';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// ============================================================================
// Types
// ============================================================================

interface AvatarUploadProps {
  currentImageUrl?: string;
  userName?: string;
  onAvatarUploaded: () => void;
  disabled?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name?: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return words[0]?.[0]?.toUpperCase() || '?';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Avatar upload component with in-browser cropping.
 *
 * Flow: click avatar -> file picker -> crop dialog (round preview) -> upload via presigned URL
 */
export function AvatarUpload({
  currentImageUrl,
  userName,
  onAvatarUploaded,
  disabled,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
  const [imgError, setImgError] = useState(false);

  const {
    status,
    progress,
    upload,
    reset: resetUpload,
  } = useAvatarUpload({
    onSuccess: () => {
      onAvatarUploaded();
      // Force avatar reload by bumping preview URL
      setPreviewUrl(currentImageUrl ? `${currentImageUrl}?v=${Date.now()}` : undefined);
      setImgError(false);
      closeCropDialog();
    },
  });

  const removeAvatar = useRemoveAvatar();

  const isUploading = status === 'creating' || status === 'uploading' || status === 'confirming';

  // --------------------------------------------------------------------------
  // Remove avatar
  // --------------------------------------------------------------------------

  const handleRemove = useCallback(async () => {
    try {
      await removeAvatar.mutateAsync();
      setPreviewUrl(undefined);
      setImgError(false);
      onAvatarUploaded();
    } catch {
      // Error handled by useRemoveAvatar hook (toast)
    }
  }, [removeAvatar, onAvatarUploaded]);

  // --------------------------------------------------------------------------
  // File selection
  // --------------------------------------------------------------------------

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('Nur PNG, JPG und WebP Dateien sind erlaubt.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setValidationError('Die Datei darf maximal 5 MB groß sein.');
      return;
    }

    setValidationError(null);

    // Read file as data URL for crop preview
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropDialog(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // --------------------------------------------------------------------------
  // Crop complete callback
  // --------------------------------------------------------------------------

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // --------------------------------------------------------------------------
  // Upload cropped image
  // --------------------------------------------------------------------------

  const handleUpload = useCallback(async () => {
    if (!selectedImage || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
      const jpegBlob = new Blob([croppedBlob], { type: 'image/jpeg' });
      await upload(jpegBlob, 'avatar.jpg');
    } catch {
      // Error handled by useAvatarUpload hook
    }
  }, [selectedImage, croppedAreaPixels, upload]);

  // --------------------------------------------------------------------------
  // Dialog close
  // --------------------------------------------------------------------------

  const closeCropDialog = useCallback(() => {
    setShowCropDialog(false);
    setSelectedImage(null);
    setCroppedAreaPixels(null);
    resetUpload();
  }, [resetUpload]);

  // --------------------------------------------------------------------------
  // Sync preview when the parent provides a new URL
  // --------------------------------------------------------------------------

  useEffect(() => {
    setPreviewUrl(currentImageUrl);
    setImgError(false);
  }, [currentImageUrl]);

  const showImage = previewUrl && !imgError;
  const initials = getInitials(userName);

  return (
    <>
      {/* Clickable avatar with camera overlay */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="group relative size-24 overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Profilbild hochladen"
          >
            {showImage ? (
              <img
                src={previewUrl}
                alt="Profilbild"
                className="size-full rounded-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-muted text-xl font-medium text-muted-foreground">
                {initials}
              </div>
            )}
            {/* Camera overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
              <Camera className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>

          {/* Remove button */}
          {showImage && !disabled && !isUploading && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removeAvatar.isPending}
              className="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              aria-label="Profilbild entfernen"
            >
              {removeAvatar.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
            </button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {showImage ? 'Profilbild ändern' : 'Profilbild hochladen'}
        </span>

        {/* Validation error */}
        {validationError && <p className="text-xs text-destructive">{validationError}</p>}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* Crop dialog */}
      <Dialog
        open={showCropDialog}
        onOpenChange={(open) => !open && !isUploading && closeCropDialog()}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isUploading}>
          <DialogHeader>
            <DialogTitle>Profilbild zuschneiden</DialogTitle>
            <DialogDescription>
              Verschiebe und zoome das Bild, um den gewünschten Ausschnitt zu wählen.
            </DialogDescription>
          </DialogHeader>

          {/* Crop area */}
          <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-lg bg-muted">
            {selectedImage && (
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3 px-2">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
              disabled={isUploading}
            />
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {status === 'creating' && 'Wird vorbereitet...'}
                {status === 'uploading' && 'Wird hochgeladen...'}
                {status === 'confirming' && 'Wird bestätigt...'}
              </p>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && (
            <p className="text-center text-xs text-destructive">
              Fehler beim Hochladen. Bitte versuche es erneut.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCropDialog}
              disabled={isUploading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !croppedAreaPixels}
            >
              {isUploading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
