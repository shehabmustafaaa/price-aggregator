import { describe, it, expect } from "vitest";
import { variantConfig, detectNetwork } from "./variant";

describe("detectNetwork", () => {
  it("detects 5G / 4G / LTE from the title", () => {
    expect(detectNetwork("Galaxy A56 5G")).toBe("5G");
    expect(detectNetwork("Redmi Note 13 4G")).toBe("4G");
    expect(detectNetwork("شبكة 4G LTE")).toBe("4G");
  });

  it("returns null when no network is mentioned", () => {
    expect(detectNetwork("iPhone 15 128GB")).toBe(null);
  });
});

describe("variantConfig", () => {
  it("reads storage/ram from attrs and derives network from the title", () => {
    expect(
      variantConfig({ storage_gb: 256, ram_gb: 8 }, "Galaxy A56 5G"),
    ).toEqual({ storage_gb: 256, ram_gb: 8, network: "5G" });
  });

  it("uses null for missing/non-numeric storage and ram", () => {
    expect(variantConfig({}, "Nokia 3310")).toEqual({
      storage_gb: null,
      ram_gb: null,
      network: null,
    });
    expect(
      variantConfig({ storage_gb: "256" }, "Nokia 3310"),
    ).toEqual({ storage_gb: null, ram_gb: null, network: null });
  });
});
