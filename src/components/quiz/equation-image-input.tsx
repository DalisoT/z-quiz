"use client";

import { useState } from "react";

/**
 * File input for "equation" / handwriting questions.
 * Lets the user pick a photo of their handwritten working and shows a preview
 * before submission. The file itself is submitted via the parent <form> and
 * ends up in the Server Action's FormData under the given `name`.
 */
export function EquationImageInput({
  name,
  required = false,
}: {
  name: string;
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10 MB).");
      e.target.value = "";
      return;
    }
    // Revoke any previous object URL to avoid memory leaks
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-foreground">
          Upload a photo of your handwritten working
        </span>
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleChange}
          required={required}
          className="mt-2 block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/70"
        />
      </label>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {preview && fileName && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Preview: <span className="font-medium">{fileName}</span>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview of your handwritten work"
            className="max-h-80 w-full rounded object-contain"
          />
        </div>
      )}
    </div>
  );
}
