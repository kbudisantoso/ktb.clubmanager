import type { Area } from 'react-easy-crop';

/**
 * Shared canvas crop helper for image upload components.
 *
 * Draws the selected crop area onto an offscreen canvas and returns
 * the result as a Blob.
 *
 * @param format - 'image/jpeg' (default, quality 0.9) or 'image/png' (lossless, preserves transparency)
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<Blob> {
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
      format,
      format === 'image/jpeg' ? 0.9 : undefined
    );
  });
}
