"use client";

import { useState, useEffect, useCallback } from "react";

interface Run {
  runId: string;
  createdAt: string;
  status: string;
  totalItems: number;
  successCount: number;
  failureCount: number;
}

interface LogEntry {
  id: number;
  runId: string;
  syohinCode: string;
  mall: string;
  oldPrice: number | null;
  newPrice: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface MallSummary {
  total: number;
  success: number;
  failure: number;
  pending: number;
}

const MALL_LABELS: Record<string, string> = {
  ne: "NE",
  rakuten: "楽天",
  yahoo: "Yahoo",
  shopify: "Shopify",
};

export default function ResultsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mallSummary, setMallSummary] = useState<Record<string, MallSummary>>(
    {}
  );
  const [run, setRun] = useState<Run | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // run 一覧を取得
  useEffect(() => {
    fetch("/api/execute/results")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRuns(data.runs ?? []);
      });
  }, []);

  // run 詳細を取得
  const fetchDetail = useCallback(async (runId: string) => {
    setLoading(true);
    const res = await fetch(`/api/execute/results?runId=${runId}`);
    const data = await res.json();
    if (data.success) {
      setRun(data.run);
      setLogs(data.logs ?? []);
      setMallSummary(data.mallSummary ?? {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedRunId) fetchDetail(selectedRunId);
  }, [selectedRunId, fetchDetail]);

  // リトライ
  const handleRetry = async (mall: string) => {
    if (!selectedRunId) return;
    setRetrying(mall);
    const res = await fetch("/api/execute/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: selectedRunId, mall }),
    });
    await res.json();
    setRetrying(null);
    // 結果を再取得
    fetchDetail(selectedRunId);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      partial_failure: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      pending: "bg-gray-100 text-gray-800",
      success: "bg-green-100 text-green-800",
      failure: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">反映結果</h2>

      {/* Run 一覧 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-lg font-semibold">実行履歴</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500">実行履歴がありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">実行日時</th>
                <th className="p-2">ステータス</th>
                <th className="p-2">合計</th>
                <th className="p-2">成功</th>
                <th className="p-2">失敗</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.runId} className="border-b hover:bg-gray-50">
                  <td className="p-2">{r.createdAt}</td>
                  <td className="p-2">{statusBadge(r.status)}</td>
                  <td className="p-2">{r.totalItems}</td>
                  <td className="p-2 text-green-600">{r.successCount}</td>
                  <td className="p-2 text-red-600">{r.failureCount}</td>
                  <td className="p-2">
                    <button
                      onClick={() => setSelectedRunId(r.runId)}
                      className="text-blue-600 hover:underline"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Run 詳細 */}
      {selectedRunId && run && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              実行詳細 {statusBadge(run.status)}
            </h3>
            <button
              onClick={() => setSelectedRunId(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              閉じる
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : (
            <>
              {/* モール別サマリー */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(mallSummary).map(([mall, summary]) => (
                  <div key={mall} className="rounded-lg border p-3">
                    <div className="mb-1 font-medium">
                      {MALL_LABELS[mall] ?? mall}
                    </div>
                    <div className="text-xs text-gray-600">
                      成功: {summary.success} / 失敗: {summary.failure} /
                      保留: {summary.pending}
                    </div>
                    {summary.failure > 0 && (
                      <button
                        onClick={() => handleRetry(mall)}
                        disabled={retrying === mall}
                        className="mt-2 rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {retrying === mall ? "リトライ中..." : "リトライ"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ログ詳細 */}
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-1">商品コード</th>
                      <th className="p-1">モール</th>
                      <th className="p-1">旧価格</th>
                      <th className="p-1">新価格</th>
                      <th className="p-1">状態</th>
                      <th className="p-1">エラー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-1 font-mono">{log.syohinCode}</td>
                        <td className="p-1">
                          {MALL_LABELS[log.mall] ?? log.mall}
                        </td>
                        <td className="p-1 text-right">
                          {log.oldPrice ?? "-"}
                        </td>
                        <td className="p-1 text-right">{log.newPrice}</td>
                        <td className="p-1">{statusBadge(log.status)}</td>
                        <td className="max-w-xs truncate p-1 text-red-500">
                          {log.errorMessage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
