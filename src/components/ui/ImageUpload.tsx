'use client';

import React, { useState, useRef } from 'react';
import { compressImage, formatFileSize } from '@/lib/imageCompression';
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  productCode?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  productCode,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }

    try {
      setCompressing(true);
      setError(null);

      // Compress to strictly <= 500KB
      const result = await compressImage(file, 500 * 1024, 1200);

      setPreview(result.dataUrl);
      setCompressionStats({
        originalSize: result.originalSizeBytes,
        compressedSize: result.compressedSizeBytes,
      });

      onChange(result.file, result.dataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setError(err.message || 'Failed to compress image.');
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setCompressionStats(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange(null, null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
          Product Image <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
        </label>
        <span className="text-[10px] text-slate-400 font-mono">Max 500KB • WebP/JPG/PNG</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || compressing}
        className="hidden"
      />

      {preview ? (
        /* Preview Card */
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Product preview"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 font-sans">Image Ready for Upload</span>
            </div>

            {compressionStats && (
              <div className="text-[11px] font-mono text-slate-500 space-y-0.5">
                <p>
                  Original: <span className="text-slate-700">{formatFileSize(compressionStats.originalSize)}</span>
                </p>
                <p className="flex items-center justify-center sm:justify-start space-x-1 text-emerald-700 font-bold">
                  <span>Compressed: {formatFileSize(compressionStats.compressedSize)}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans uppercase">
                    ≤ 500KB
                  </span>
                </p>
              </div>
            )}

            <div className="flex items-center justify-center sm:justify-start space-x-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || compressing}
                className="btn-press px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-md shadow-xs transition"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || compressing}
                className="btn-press px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-md transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Area */
        <div
          onClick={() => !compressing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 transition flex flex-col items-center justify-center text-center space-y-2.5 ${
            isDragging
              ? 'border-slate-900 bg-slate-100/80'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          } ${disabled || compressing ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {compressing ? (
            <div className="flex flex-col items-center space-y-2">
              <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
              <p className="text-xs font-bold text-slate-800 font-sans">
                Compressing image under 500KB...
              </p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-700">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 font-sans">
                  Click to upload or drag & drop garment picture <span className="text-slate-400 font-normal">(Optional)</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Optional • PNG, JPG, or WebP (Auto-compressed to ≤ 500KB)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
