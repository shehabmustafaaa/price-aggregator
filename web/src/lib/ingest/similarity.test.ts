import { describe, it, expect } from "vitest";
import {
  tokenize,
  overlapScore,
  hasAllModelTokens,
  qualifiersMatch,
  sameBrand,
  scoreProductPair,
} from "./similarity";

describe("tokenize", () => {
  it("normalizes, lowercases, and drops length-1 tokens", () => {
    expect(tokenize("Samsung Galaxy A56 5G")).toEqual(
      new Set(["samsung", "galaxy", "a56", "5g"]),
    );
  });
});

describe("overlapScore", () => {
  it("is the fraction of name tokens present in the raw set", () => {
    const raw = tokenize("samsung galaxy a56 5g");
    expect(overlapScore(raw, tokenize("galaxy a56"))).toBe(1);
  });

  it("is 0 for disjoint token sets", () => {
    expect(overlapScore(tokenize("apple iphone"), tokenize("samsung galaxy"))).toBe(0);
  });
});

describe("hasAllModelTokens", () => {
  it("passes when every digit-bearing name token is in the listing", () => {
    expect(hasAllModelTokens(tokenize("galaxy a56 5g"), tokenize("galaxy a56"))).toBe(true);
  });

  it("fails when a model digit token differs (A56 vs A17)", () => {
    expect(hasAllModelTokens(tokenize("galaxy a56"), tokenize("galaxy a17"))).toBe(false);
  });
});

describe("qualifiersMatch", () => {
  it("passes when qualifier sets are identical", () => {
    expect(qualifiersMatch(tokenize("iphone 16 pro"), tokenize("iphone 16 pro"))).toBe(true);
  });

  it("fails when qualifiers differ (16 vs 16 Pro)", () => {
    expect(qualifiersMatch(tokenize("iphone 16"), tokenize("iphone 16 pro"))).toBe(false);
  });
});

describe("sameBrand", () => {
  it("is case- and whitespace-insensitive", () => {
    expect(sameBrand(" Samsung ", "samsung")).toBe(true);
  });
  it("distinguishes different brands", () => {
    expect(sameBrand("Apple", "Samsung")).toBe(false);
  });
});

describe("scoreProductPair", () => {
  const p = (nameEn: string, nameAr = "", brandName: string | null = null) => ({
    nameEn,
    nameAr,
    brandName,
  });

  it("scores a genuine duplicate high despite 5G/storage noise", () => {
    expect(
      scoreProductPair(
        p("Galaxy A56 5G 256GB", "", "Samsung"),
        p("Galaxy A56", "", "Samsung"),
      ),
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("scores 0 for a different model (A56 vs A17)", () => {
    expect(
      scoreProductPair(
        p("Galaxy A56", "", "Samsung"),
        p("Galaxy A17", "", "Samsung"),
      ),
    ).toBe(0);
  });

  it("scores 0 for a different qualifier (16 vs 16 Pro)", () => {
    expect(
      scoreProductPair(
        p("iPhone 16", "", "Apple"),
        p("iPhone 16 Pro", "", "Apple"),
      ),
    ).toBe(0);
  });

  it("matches on the Arabic name when the English differs in wording", () => {
    expect(
      scoreProductPair(
        p("Galaxy A56 5G", "جالاكسي A56", "Samsung"),
        p("SM-A56", "جالاكسي A56", "Samsung"),
      ),
    ).toBeGreaterThanOrEqual(0.6);
  });
});
