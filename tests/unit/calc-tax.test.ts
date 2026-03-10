import { describe, it, expect } from "vitest";
import { calcTaxIncludedPrice } from "@/lib/utils";

describe("calcTaxIncludedPrice", () => {
  it("税率10%で正しく切り捨て計算する", () => {
    expect(calcTaxIncludedPrice(980, 10)).toBe(1078);
  });

  it("税率8%で正しく切り捨て計算する", () => {
    // 980 × 1.08 = 1058.4 → 1058
    expect(calcTaxIncludedPrice(980, 8)).toBe(1058);
  });

  it("税率0%なら元の価格のまま", () => {
    expect(calcTaxIncludedPrice(1000, 0)).toBe(1000);
  });

  it("端数切り捨てが正しく動く", () => {
    // 999 × 1.10 = 1098.9 → 1098
    expect(calcTaxIncludedPrice(999, 10)).toBe(1098);
  });

  it("0円の場合", () => {
    expect(calcTaxIncludedPrice(0, 10)).toBe(0);
  });
});
