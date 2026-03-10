import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "商品価格改定ツール",
  description: "NEベースの商品価格一括改定ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <nav className="w-56 border-r border-gray-200 bg-white p-4">
            <h1 className="mb-6 text-lg font-bold">価格改定ツール</h1>
            <ul className="space-y-1">
              <li>
                <a
                  href="/"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  ダッシュボード
                </a>
              </li>
              <li>
                <a
                  href="/import"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  CSVインポート
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  価格改定
                </a>
              </li>
              <li>
                <a
                  href="/results"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  反映結果
                </a>
              </li>
              <li>
                <a
                  href="/backups"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  バックアップ
                </a>
              </li>
              <li>
                <a
                  href="/settings"
                  className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                >
                  設定
                </a>
              </li>
            </ul>
          </nav>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
