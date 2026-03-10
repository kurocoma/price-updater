"use client";

import { useState, useEffect, useCallback } from "react";

interface MallAuthStatus {
  mall: string;
  label: string;
  configured: boolean;
  details: string;
}

interface TestResult {
  ok: boolean;
  message: string;
}

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<MallAuthStatus[]>([]);
  const [neAuthUrl, setNeAuthUrl] = useState<string | null>(null);
  const [yahooAuthUrl, setYahooAuthUrl] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {}
  );
  const [testing, setTesting] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    setStatuses(data.statuses);
    setNeAuthUrl(data.neAuthUrl);
    setYahooAuthUrl(data.yahooAuthUrl);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTest = async (mall: string) => {
    setTesting(mall);
    setTestResults((prev) => ({ ...prev, [mall]: undefined! }));
    try {
      const res = await fetch("/api/auth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mall }),
      });
      const result: TestResult = await res.json();
      setTestResults((prev) => ({ ...prev, [mall]: result }));
    } catch (e) {
      setTestResults((prev) => ({
        ...prev,
        [mall]: { ok: false, message: String(e) },
      }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">設定</h2>

      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold">API認証状況</h3>
        <div className="space-y-3">
          {statuses.map((s) => (
            <div
              key={s.mall}
              className="flex items-center justify-between rounded-lg border bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    s.configured ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-sm text-gray-500">{s.details}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* NE未認証時: OAuth認証ボタン */}
                {s.mall === "ne" && neAuthUrl && (
                  <a
                    href={neAuthUrl}
                    className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    NE認証
                  </a>
                )}

                {/* Yahoo未認証時: OAuth認証ボタン */}
                {s.mall === "yahoo" && yahooAuthUrl && (
                  <a
                    href={yahooAuthUrl}
                    className="rounded bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Yahoo認証
                  </a>
                )}

                {/* 接続テストボタン */}
                <button
                  onClick={() => handleTest(s.mall)}
                  disabled={!s.configured || testing === s.mall}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testing === s.mall ? "テスト中..." : "接続テスト"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* テスト結果 */}
        {Object.keys(testResults).length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">
              テスト結果
            </h4>
            {Object.entries(testResults).map(
              ([mall, result]) =>
                result && (
                  <div
                    key={mall}
                    className={`rounded-lg border p-3 text-sm ${
                      result.ok
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <span className="font-medium">
                      {result.ok ? "OK" : "NG"} [{mall}]
                    </span>
                    <span className="ml-2 text-gray-600">{result.message}</span>
                  </div>
                )
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">環境変数の設定方法</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            APIキーは <code className="rounded bg-gray-100 px-1">.env</code>{" "}
            ファイルに設定してください。
          </p>
          <p>
            設定後、開発サーバーを再起動すると反映されます。
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-gray-700">
              .env テンプレート
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
              {`# --- ネクストエンジン ---
NE_CLIENT_ID=your_client_id
NE_CLIENT_SECRET=your_client_secret
NE_REDIRECT_URI=https://localhost:3000/api/auth/ne/callback
NE_ACCESS_TOKEN=  # OAuth認証後に自動設定
NE_REFRESH_TOKEN= # OAuth認証後に自動設定

# --- 楽天 RMS ---
RAKUTEN_SERVICE_SECRET=your_service_secret
RAKUTEN_LICENSE_KEY=your_license_key

# --- Yahoo!ショッピング ---
YAHOO_CLIENT_ID=your_client_id
YAHOO_CLIENT_SECRET=your_client_secret
YAHOO_SELLER_ID=your_seller_id
YAHOO_ACCESS_TOKEN=  # OAuth認証後に自動設定
YAHOO_REFRESH_TOKEN= # OAuth認証後に自動設定

# --- Shopify (Client Credentials Grant) ---
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
