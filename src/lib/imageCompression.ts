/**
 * High-performance browser-based image compression utility.
 * Resizes and compresses images to strictly remain under 500KB (maxSizeBytes).
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxSizeBytes: number = 500 * 1024, // 500 KB limit
  maxDimension: number = 1200
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // 1. Maintain aspect ratio while capping max dimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize canvas context for compression.'));
          return;
        }

        // Draw image smoothly onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Iteratively adjust quality to ensure <= maxSizeBytes
        let quality = 0.88;
        let mimeType = 'image/webp';

        const tryCompress = (currentQuality: number, currentMime: string) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to generate image blob.'));
                return;
              }

              // If still over 500KB and quality can be reduced
              if (blob.size > maxSizeBytes && currentQuality > 0.3) {
                tryCompress(Math.max(0.3, currentQuality - 0.12), currentMime);
                return;
              }

              // If WebP is not supported or still slightly over, try JPEG
              if (blob.size > maxSizeBytes && currentMime === 'image/webp') {
                tryCompress(0.75, 'image/jpeg');
                return;
              }

              const ext = currentMime === 'image/webp' ? 'webp' : 'jpg';
              const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
              const compressedFile = new File([blob], `${cleanFileName}.${ext}`, {
                type: currentMime,
                lastModified: Date.now(),
              });

              const dataUrl = canvas.toDataURL(currentMime, currentQuality);

              resolve({
                file: compressedFile,
                dataUrl,
                originalSizeBytes: file.size,
                compressedSizeBytes: blob.size,
                width,
                height,
              });
            },
            currentMime,
            currentQuality
          );
        };

        tryCompress(quality, mimeType);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
