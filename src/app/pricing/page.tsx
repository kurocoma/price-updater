"use client";

import { useState, useCallback } from "react";
import { calcTaxIncludedPrice } from "@/lib/utils";

// --- Types ---

interface UploadItem {
  syohinCode: string;
  syohinName: string;
  currentPrice: number;
  newPrice: number;
  taxRate: number;
  found: boolean;
}

interface SetItemData {
  setSyohinCode: string;
  setSyohinName: string;
  setBaikaTnk: number;
  taxRate: number;
  components: { syohinCode: string; suryo: number }[];
}

interface SetPriceEntry {
  setSyohinCode: string;
  setSyohinName: string;
  currentPrice: number;
  newPrice: number | null; // ユーザー入力
  taxRate: number;
}

interface PreviewMall {
  mallCode: string;
  currentPrice: number;
  newPrice: number;
  found: boolean;
}

interface PreviewItem {
  syohinCode: string;
  isSet: boolean;
  newPriceTaxExcluded: number;
  taxRate: number;
  ne: { currentPrice: number; newPrice: number; found: boolean };
  rakuten: PreviewMall;
  yahoo: PreviewMall & { salePrice: number | null };
  shopify: PreviewMall & { variantId: string; productId: string };
}

type Step = "upload" | "set-prices" | "preview";

const MALLS = [
  { id: "ne" as const, label: "NE" },
  { id: "rakuten" as const, label: "楽天" },
  { id: "yahoo" as const, label: "Yahoo" },
  { id: "shopify" as const, label: "Shopify" },
];

// --- Page ---

export default function PricingPage() {
  const [step, setStep] = useState<Step>("upload");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [relatedSets, setRelatedSets] = useState<SetItemData[]>([]);
  const [setPrices, setSetPrices] = useState<SetPriceEntry[]>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [selectedMalls, setSelectedMalls] = useState<Record<string, boolean>>({
    ne: true,
    rakuten: true,
    yahoo: true,
    shopify: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // --- Step 1: CSV Upload ---
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pricing/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        setErrors([data.error, ...(data.errors ?? [])]);
        return;
      }

      setItems(data.items);
      setRelatedSets(data.setItems);

      if (data.errors) setErrors(data.errors);

      // セット商品がなければプレビューへ、あれば価格入力へ
      if (data.setItems.length > 0) {
        setSetPrices(
          data.setItems.map((s: SetItemData) => ({
            setSyohinCode: s.setSyohinCode,
            setSyohinName: s.setSyohinName,
            currentPrice: s.setBaikaTnk,
            newPrice: null,
            taxRate: s.taxRate,
          }))
        );
        setStep("set-prices");
      } else {
        setStep("preview");
        await fetchPreview(data.items, []);
      }
    } catch (e) {
      setErrors([String(e)]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Step 2 → 3: Fetch Preview ---
  const fetchPreview = async (
    singleItems: UploadItem[],
    setEntries: SetPriceEntry[]
  ) => {
    setLoading(true);
    try {
      const allItems = [
        ...singleItems.map((i) => ({
          syohinCode: i.syohinCode,
          newPrice: i.newPrice,
          taxRate: i.taxRate,
          isSet: false,
        })),
        ...setEntries
          .filter((s) => s.newPrice !== null)
          .map((s) => ({
            syohinCode: s.setSyohinCode,
            newPrice: s.newPrice!,
            taxRate: s.taxRate,
            isSet: true,
          })),
      ];

      const activeMalls = (
        Object.entries(selectedMalls) as [string, boolean][]
      )
        .filter(([, v]) => v)
        .map(([k]) => k)
        .filter((k) => k !== "ne") as ("rakuten" | "yahoo" | "shopify")[];

      const res = await fetch("/api/pricing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: allItems, malls: activeMalls }),
      });

      const data = await res.json();
      if (data.success) {
        setPreview(data.preview);
        setStep("preview");
      } else {
        setErrors([data.error]);
      }
    } catch (e) {
      setErrors([String(e)]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPricesDone = () => {
    const missing = setPrices.filter((s) => s.newPrice === null);
    if (missing.length > 0) {
      setErrors([
        `未入力のセット商品があります: ${missing.map((m) => m.setSyohinCode).join(", ")}`,
      ]);
      return;
    }
    setErrors([]);
    fetchPreview(items, setPrices);
  };

  // --- Reset ---
  const handleReset = () => {
    setStep("upload");
    setItems([]);
    setRelatedSets([]);
    setSetPrices([]);
    setPreview([]);
    setErrors([]);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">価格改定</h2>
        {step !== "upload" && (
          <button
            onClick={handleReset}
            className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          >
            やり直す
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex gap-4 text-sm">
        {[
          { key: "upload", label: "1. CSVアップロード" },
          { key: "set-prices", label: "2. セット商品価格" },
          { key: "preview", label: "3. プレビュー" },
        ].map((s) => (
          <span
            key={s.key}
            className={`rounded-full px-3 py-1 ${
              step === s.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700">
              {e}
            </p>
          ))}
        </div>
      )}

      {loading && (
        <div className="mb-4 text-sm text-blue-600">処理中...</div>
      )}

      {step === "upload" && (
        <UploadStep onUpload={handleUpload} loading={loading} />
      )}

      {step === "set-prices" && (
        <SetPricesStep
          items={items}
          relatedSets={relatedSets}
          setPrices={setPrices}
          onSetPriceChange={(code, price) => {
            setSetPrices((prev) =>
              prev.map((s) =>
                s.setSyohinCode === code ? { ...s, newPrice: price } : s
              )
            );
          }}
          onNext={handleSetPricesDone}
          loading={loading}
        />
      )}

      {step === "preview" && (
        <PreviewStep
          preview={preview}
          selectedMalls={selectedMalls}
          onMallToggle={(mall) =>
            setSelectedMalls((prev) => ({ ...prev, [mall]: !prev[mall] }))
          }
        />
      )}
    </div>
  );
}

// --- Step 1: Upload ---

function UploadStep({
  onUpload,
  loading,
}: {
  onUpload: (file: File) => void;
  loading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <a
          href="/api/pricing/template"
          className="inline-block rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          CSVテンプレートをダウンロード
        </a>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-white hover:border-gray-400"
        } ${loading ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onUpload(file);
        }}
      >
        <p className="mb-2 text-gray-600">
          価格改定CSVをアップロード
        </p>
        <p className="mb-4 text-xs text-gray-400">
          フォーマット: syohin_code, new_price（税抜）
        </p>
        <label className="inline-block cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          ファイルを選択
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-xs text-gray-400">
          またはドラッグ&ドロップ
        </p>
      </div>
    </div>
  );
}

// --- Step 2: Set Prices ---

function SetPricesStep({
  items,
  relatedSets,
  setPrices,
  onSetPriceChange,
  onNext,
  loading,
}: {
  items: UploadItem[];
  relatedSets: SetItemData[];
  setPrices: SetPriceEntry[];
  onSetPriceChange: (code: string, price: number | null) => void;
  onNext: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* 単品商品サマリー */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">
          単品商品（{items.length}件）
        </h3>
        <div className="max-h-48 overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">商品コード</th>
                <th className="px-3 py-2 text-left">商品名</th>
                <th className="px-3 py-2 text-right">現在価格</th>
                <th className="px-3 py-2 text-right">新価格</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.syohinCode} className="border-t">
                  <td className="px-3 py-1 font-mono text-xs">
                    {item.syohinCode}
                  </td>
                  <td className="px-3 py-1">{item.syohinName}</td>
                  <td className="px-3 py-1 text-right">
                    {item.currentPrice.toLocaleString()}
                  </td>
                  <td className="px-3 py-1 text-right font-semibold">
                    {item.newPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* セット商品価格入力 */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">
          関連セット商品（{relatedSets.length}件）— 新価格を入力してください
        </h3>
        <div className="space-y-3">
          {setPrices.map((entry) => {
            const setData = relatedSets.find(
              (s) => s.setSyohinCode === entry.setSyohinCode
            );
            return (
              <div
                key={entry.setSyohinCode}
                className="rounded-lg border bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-medium">
                      {entry.setSyohinCode}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {entry.setSyohinName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    現在価格: {entry.currentPrice.toLocaleString()}円
                  </span>
                </div>

                {/* 構成品 */}
                {setData && (
                  <div className="mb-3 text-xs text-gray-500">
                    構成品:{" "}
                    {setData.components
                      .map((c) => `${c.syohinCode} ×${c.suryo}`)
                      .join(", ")}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-sm">新価格（税抜）:</label>
                  <input
                    type="number"
                    min="0"
                    className="w-32 rounded border px-2 py-1 text-right text-sm"
                    value={entry.newPrice ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onSetPriceChange(
                        entry.setSyohinCode,
                        val === "" ? null : Number(val)
                      );
                    }}
                  />
                  <span className="text-xs text-gray-400">
                    税込: {entry.newPrice !== null ? calcTaxIncludedPrice(entry.newPrice, entry.taxRate).toLocaleString() : "-"}円
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={loading}
        className="rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "現在価格を取得中..." : "プレビューへ進む"}
      </button>
    </div>
  );
}

// --- Step 3: Preview ---

function PreviewStep({
  preview,
  selectedMalls,
  onMallToggle,
}: {
  preview: PreviewItem[];
  selectedMalls: Record<string, boolean>;
  onMallToggle: (mall: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* モール選択 */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">反映対象モール:</span>
        {MALLS.map((mall) => (
          <label key={mall.id} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={selectedMalls[mall.id] ?? true}
              onChange={() => onMallToggle(mall.id)}
            />
            {mall.label}
          </label>
        ))}
      </div>

      {/* プレビューテーブル */}
      <div className="overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">商品コード</th>
              <th className="px-3 py-2 text-left">種別</th>
              {selectedMalls.ne && (
                <th className="px-3 py-2 text-right">NE 現在→新</th>
              )}
              {selectedMalls.rakuten && (
                <th className="px-3 py-2 text-right">楽天 現在→新</th>
              )}
              {selectedMalls.yahoo && (
                <th className="px-3 py-2 text-right">Yahoo 現在→新</th>
              )}
              {selectedMalls.shopify && (
                <th className="px-3 py-2 text-right">Shopify 現在→新</th>
              )}
            </tr>
          </thead>
          <tbody>
            {preview.map((item) => (
              <tr key={item.syohinCode} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">
                  {item.syohinCode}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      item.isSet
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.isSet ? "セット" : "単品"}
                  </span>
                </td>
                {selectedMalls.ne && (
                  <PriceCell
                    currentPrice={item.ne.currentPrice}
                    newPrice={item.ne.newPrice}
                    found={item.ne.found}
                    suffix="(税抜)"
                  />
                )}
                {selectedMalls.rakuten && (
                  <PriceCell
                    currentPrice={item.rakuten.currentPrice}
                    newPrice={item.rakuten.newPrice}
                    found={item.rakuten.found}
                    suffix="(税抜)"
                  />
                )}
                {selectedMalls.yahoo && (
                  <PriceCell
                    currentPrice={item.yahoo.currentPrice}
                    newPrice={item.yahoo.newPrice}
                    found={item.yahoo.found}
                    suffix="(税込)"
                  />
                )}
                {selectedMalls.shopify && (
                  <PriceCell
                    currentPrice={item.shopify.currentPrice}
                    newPrice={item.shopify.newPrice}
                    found={item.shopify.found}
                    suffix="(税込)"
                  />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        ※ 価格反映の実行は次のマイルストーン（M07〜M10）で実装されます
      </p>
    </div>
  );
}

function PriceCell({
  currentPrice,
  newPrice,
  found,
  suffix,
}: {
  currentPrice: number;
  newPrice: number;
  found: boolean;
  suffix: string;
}) {
  const changed = currentPrice !== newPrice;

  if (!found) {
    return (
      <td className="px-3 py-2 text-right text-xs text-gray-400">
        未登録 → {newPrice.toLocaleString()}
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-right">
      <span className={changed ? "text-gray-400 line-through" : ""}>
        {currentPrice.toLocaleString()}
      </span>
      {changed && (
        <>
          <span className="mx-1 text-gray-400">→</span>
          <span className="font-semibold text-blue-700">
            {newPrice.toLocaleString()}
          </span>
        </>
      )}
      <span className="ml-1 text-xs text-gray-400">{suffix}</span>
    </td>
  );
}
