"use client";

import { useState, useCallback } from "react";

type CSVType = "syohin_basic" | "set_syohin" | "himoduke";

interface ImportResult {
  csvType: CSVType;
  fileName: string;
  success: boolean;
  message: string;
  recordCount?: number;
}

const CSV_TYPES: { value: CSVType; label: string; description: string }[] = [
  {
    value: "syohin_basic",
    label: "単品商品 (syohin_basic)",
    description: "syohin_basic○○.csv",
  },
  {
    value: "set_syohin",
    label: "セット商品 (set_syohin)",
    description: "set_syohin○○.csv",
  },
  {
    value: "himoduke",
    label: "紐づけ (himoduke)",
    description: "himoduke○○.csv",
  },
];

export default function ImportPage() {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [uploading, setUploading] = useState<CSVType | null>(null);

  const handleUpload = useCallback(
    async (csvType: CSVType, file: File) => {
      setUploading(csvType);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("csvType", csvType);

        const res = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        setResults((prev) => [
          {
            csvType,
            fileName: file.name,
            success: data.success,
            message: data.message ?? data.error ?? "Unknown error",
            recordCount: data.recordCount,
          },
          ...prev,
        ]);
      } catch (error) {
        setResults((prev) => [
          {
            csvType,
            fileName: file.name,
            success: false,
            message: String(error),
          },
          ...prev,
        ]);
      } finally {
        setUploading(null);
      }
    },
    []
  );

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">CSVインポート</h2>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {CSV_TYPES.map((type) => (
          <UploadCard
            key={type.value}
            csvType={type.value}
            label={type.label}
            description={type.description}
            uploading={uploading === type.value}
            onUpload={handleUpload}
          />
        ))}
      </div>

      {results.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">インポート結果</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  r.success
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <span className="font-medium">
                  {r.success ? "✓" : "✗"} [{r.csvType}] {r.fileName}
                </span>
                <span className="ml-2 text-gray-600">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadCard({
  csvType,
  label,
  description,
  uploading,
  onUpload,
}: {
  csvType: CSVType;
  label: string;
  description: string;
  uploading: boolean;
  onUpload: (csvType: CSVType, file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }
    onUpload(csvType, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 bg-white hover:border-gray-400"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <p className="mb-1 font-medium">{label}</p>
      <p className="mb-4 text-xs text-gray-500">{description}</p>

      {uploading ? (
        <p className="text-sm text-blue-600">インポート中...</p>
      ) : (
        <label className="inline-block cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          ファイルを選択
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleChange}
          />
        </label>
      )}

      <p className="mt-2 text-xs text-gray-400">
        またはドラッグ&ドロップ
      </p>
    </div>
  );
}
