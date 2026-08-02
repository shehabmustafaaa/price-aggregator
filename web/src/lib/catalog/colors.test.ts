import { describe, it, expect } from "vitest";
import { canonicalColor, colorLabel } from "./colors";

describe("canonicalColor", () => {
  it("maps English and Arabic aliases to one canonical key", () => {
    expect(canonicalColor("Black")).toBe("black");
    expect(canonicalColor("اسود")).toBe("black");
    expect(canonicalColor("Ink Black")).toBe("black"); // trailing-word alias
    expect(canonicalColor("ابيض")).toBe("white");
    expect(canonicalColor("Titanium Gray")).toBe("gray");
  });

  it("passes an unknown colour through unchanged", () => {
    expect(canonicalColor("Maroon Sparkle")).toBe("Maroon Sparkle");
  });
});

describe("colorLabel", () => {
  it("returns the localized label for a known key", () => {
    expect(colorLabel("black", "en")).toBe("Black");
    expect(colorLabel("black", "ar")).toBe("أسود");
  });

  it("falls back to the key for an unknown colour", () => {
    expect(colorLabel("Maroon Sparkle", "en")).toBe("Maroon Sparkle");
  });
});
