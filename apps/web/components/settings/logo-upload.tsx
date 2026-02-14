'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFileUpload } from '@/hooks/use-file-upload';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// ============================================================================
// Types
// ============================================================================

interface LogoUploadProps {
  currentLogoUrl?: string;
  avatarInitials?: string;
  avatarColor?: string;
  slug: string;
  onLogoUploaded: (fileId: string) => void;
  disabled?: boolean;
}

// ============================================================================
// Canvas crop helper
// ============================================================================

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob fehlgeschlagen'));
      },
      'image/png',
      0.9
    );
  });
}

// ============================================================================
// Avatar color map (mirrors club-avatar.tsx)
// ============================================================================

const AVATAR_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
};

// ============================================================================
// Component
// ============================================================================

/**
 * Logo upload component with in-browser cropping.
 *
 * Flow: click avatar -> file picker -> crop dialog (round preview) -> upload via presigned URL
 */
export function LogoUpload({
  currentLogoUrl,
  avatarInitials,
  avatarColor = 'blue',
  slug,
  onLogoUploaded,
  disabled,
}: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentLogoUrl);
  const [imgError, setImgError] = useState(false);

  const {
    status,
    progress,
    upload,
    reset: resetUpload,
  } = useFileUpload({
    slug,
    purpose: 'club-logo',
    onSuccess: (fileId, fileUrl) => {
      onLogoUploaded(fileId);
      setPreviewUrl(fileUrl);
      setImgError(false);
      closeCropDialog();
    },
    onError: () => {
      // Error is shown in dialog via upload state
    },
  });

  const isUploading = status === 'creating' || status === 'uploading' || status === 'confirming';

  // --------------------------------------------------------------------------
  // File selection
  // --------------------------------------------------------------------------

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [setSelectedImage, setShowCropDialog]
  );

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
      // Create a new blob with correct type since canvas.toBlob may lose it
      const pngBlob = new Blob([croppedBlob], { type: 'image/png' });
      await upload(pngBlob, 'club-logo.png');
    } catch {
      // Error handled by useFileUpload hook
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
  // Sync preview when the parent provides a new logo URL (e.g. after refetch)
  // --------------------------------------------------------------------------

  useEffect(() => {
    setPreviewUrl(currentLogoUrl);
    setImgError(false);
  }, [currentLogoUrl]);

  const bgColor = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.blue;
  const showImage = previewUrl && !imgError;

  return (
    <>
      {/* Clickable avatar with camera overlay */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="group relative size-28 overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Vereinslogo hochladen"
        >
          {showImage ? (
            <img
              src={previewUrl}
              alt="Vereinslogo"
              className="size-full rounded-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={`flex size-full items-center justify-center rounded-full text-2xl font-medium text-white ${bgColor}`}
            >
              {avatarInitials ?? ''}
            </div>
          )}
          {/* Camera overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
            <Camera className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>

        <span className="text-xs text-muted-foreground">Logo ändern</span>

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
            <DialogTitle>Logo zuschneiden</DialogTitle>
            <DialogDescription>
              Verschieben und zoomen Sie das Bild, um den gewünschten Ausschnitt zu wählen.
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
              Fehler beim Hochladen. Bitte versuchen Sie es erneut.
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
