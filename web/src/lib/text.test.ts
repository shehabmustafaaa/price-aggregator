import { describe, it, expect } from "vitest";
import { normalizeText, searchTokens } from "./text";

describe("normalizeText", () => {
  it("folds Arabic orthographic variants to equal forms", () => {
    // alef variants (أ إ آ → ا)
    expect(normalizeText("أحمر")).toBe(normalizeText("احمر"));
    // taa marbuta (ة → ه) and alef maqsura (ى → ي)
    expect(normalizeText("سماعة")).toBe(normalizeText("سماعه"));
    expect(normalizeText("مصطفى")).toBe(normalizeText("مصطفي"));
    // hamza carriers (ؤ → و, ئ → ي) and tatweel/diacritics stripped
    expect(normalizeText("جـــالاكسي")).toBe(normalizeText("جالاكسي"));
    // case + whitespace
    expect(normalizeText("  iPhone   15  ")).toBe("iphone 15");
  });

  it("does not collapse genuinely different words", () => {
    expect(normalizeText("احمر")).not.toBe(normalizeText("اخضر"));
  });
});

describe("searchTokens", () => {
  it("splits on non-alphanumeric and keeps meaningful tokens", () => {
    expect(searchTokens("Samsung Galaxy A56-5G")).toEqual([
      "samsung",
      "galaxy",
      "a56",
      "5g",
    ]);
  });

  it("returns no tokens for punctuation-only input", () => {
    expect(searchTokens("--- / ---")).toEqual([]);
  });
});
