import Encoding from "encoding-japanese";

/**
 * バイナリデータの文字コードを自動判定してUTF-8文字列に変換
 */
export function decodeCSVBuffer(buffer: ArrayBuffer): string {
  const uint8 = new Uint8Array(buffer);
  const detected = Encoding.detect(uint8);

  if (detected === "UTF8" || detected === "ASCII") {
    return new TextDecoder("utf-8").decode(uint8);
  }

  // Shift-JIS / EUC-JP 等 → UTF-8 に変換
  const unicodeArray = Encoding.convert(uint8, {
    to: "UNICODE",
    from: detected || "SJIS",
  });
  return Encoding.codeToString(unicodeArray);
}

/**
 * CSV文字列をパースして行ごとのオブジェクト配列にする
 * ダブルクォート囲み・改行含みフィールドに対応
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const results: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? "";
    }
    results.push(obj);
  }

  return results;
}

/**
 * CSV文字列を2次元配列にパース（RFC 4180準拠）
 */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        current.push(field);
        field = "";
        i++;
      } else if (ch === "\r") {
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
        i++;
        if (i < text.length && text[i] === "\n") i++;
      } else if (ch === "\n") {
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // 最終行
  if (field !== "" || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}
