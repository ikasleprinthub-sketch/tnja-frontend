"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface FileUploadProps {
  label: string;
  onChange: (url: string) => void;
  value?: string;
  accept?: string;
  helperText?: string;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onChange,
  value,
  accept = "image/*,application/pdf",
  helperText = "PNG, JPG, WEBP or PDF (Max 5MB)",
  error,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds the 5MB limit.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      // Trigger change callback with returned public URL
      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    onChange("");
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const isPdf = value?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>

      <div
        onClick={!value && !uploading ? triggerInput : undefined}
        className={`relative border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center transition-all ${
          value
            ? "border-green-300 bg-green-50/20"
            : error || uploadError
            ? "border-red-300 bg-red-50/20"
            : "border-orange-200 hover:border-[#FF7400] bg-gray-50/50 hover:bg-orange-50/5 cursor-pointer"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading || !!value}
        />

        {uploading ? (
          // Uploading State
          <div className="flex flex-col items-center py-4 space-y-3">
            <Loader2 className="w-8 h-8 text-[#FF7400] animate-spin" />
            <p className="text-sm font-medium text-gray-600">Uploading file to server...</p>
          </div>
        ) : value ? (
          // Uploaded Successfully State
          <div className="relative w-full flex items-center justify-between p-2 rounded-xl bg-white border border-green-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3">
              {isPdf ? (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                  <FileText size={24} />
                </div>
              ) : (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100">
                  <Image
                    src={value}
                    alt="Uploaded thumbnail"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="text-left">
                <span className="flex items-center text-xs font-bold text-green-600 gap-1 uppercase tracking-wider">
                  <CheckCircle size={12} /> Successfully Uploaded
                </span>
                <p className="text-xs text-gray-500 font-medium max-w-[220px] truncate mt-0.5">
                  {value.split("/").pop()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove File"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          // Default Upload Prompt
          <div className="flex flex-col items-center py-3 space-y-2 text-center">
            <div className="p-3 bg-orange-50 text-[#FF7400] rounded-full group-hover:scale-105 transition-transform duration-200">
              <Upload size={24} />
            </div>
            <div>
              <span className="text-sm font-bold text-[#FF7400] hover:underline">Click to upload</span>
              <span className="text-sm text-gray-500 font-medium"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">{helperText}</p>
          </div>
        )}
      </div>

      {/* Error messages */}
      {(error || uploadError) && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-semibold mt-1">
          <AlertCircle size={14} />
          {error || uploadError}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
