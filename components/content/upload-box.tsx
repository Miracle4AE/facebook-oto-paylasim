"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  accept: string;
  kind: "IMAGE" | "VIDEO";
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
};

export function UploadBox({ accept, kind, disabled, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center transition-colors",
        drag && "border-primary/60 bg-primary/5",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <UploadCloud className="mb-3 h-8 w-8 text-primary" />
      <div className="text-sm font-medium">
        {kind === "IMAGE" ? "Fotoğraf yükleyin" : "Video yükleyin"}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Sürükleyip bırakın veya tıklayın</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        disabled={disabled}
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}
