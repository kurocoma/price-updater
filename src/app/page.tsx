import { db, schema } from "@/db";
import { count } from "drizzle-orm";

async function getStats() {
  const [syohinCount] = await db
    .select({ count: count() })
    .from(schema.syohinBasic);
  const [setCount] = await db
    .select({ count: count() })
    .from(schema.setSyohin);
  const [himodukeCount] = await db
    .select({ count: count() })
    .from(schema.himoduke);
  const [runCount] = await db
    .select({ count: count() })
    .from(schema.priceChangeRun);

  const latestImports = await db
    .select()
    .from(schema.importHistory)
    .orderBy(schema.importHistory.importedAt)
    .limit(5);

  return {
    syohinCount: syohinCount.count,
    setCount: setCount.count,
    himodukeCount: himodukeCount.count,
    runCount: runCount.count,
    latestImports,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">ダッシュボード</h2>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">単品商品</p>
          <p className="text-2xl font-bold">{stats.syohinCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">セット商品（行数）</p>
          <p className="text-2xl font-bold">{stats.setCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">紐づけ</p>
          <p className="text-2xl font-bold">{stats.himodukeCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">価格改定実行回数</p>
          <p className="text-2xl font-bold">{stats.runCount}</p>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-semibold">最近のインポート</h3>
      {stats.latestImports.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだインポートされていません。「CSVインポート」からデータを取り込んでください。
        </p>
      ) : (
        <table className="w-full border-collapse rounded-lg border bg-white text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2 text-left">種別</th>
              <th className="px-4 py-2 text-left">ファイル名</th>
              <th className="px-4 py-2 text-right">件数</th>
              <th className="px-4 py-2 text-left">インポート日時</th>
            </tr>
          </thead>
          <tbody>
            {stats.latestImports.map((imp) => (
              <tr key={imp.id} className="border-b">
                <td className="px-4 py-2">{imp.csvType}</td>
                <td className="px-4 py-2">{imp.fileName}</td>
                <td className="px-4 py-2 text-right">{imp.recordCount}</td>
                <td className="px-4 py-2">{imp.importedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
