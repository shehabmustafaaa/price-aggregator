import { describe, it, expect } from "vitest";
import { isAccessory } from "./classify";

describe("isAccessory", () => {
  it("rejects standalone accessory listings (leading accessory noun)", () => {
    expect(isAccessory("Card reader USB-C to microSD")).toBe(true);
    expect(isAccessory("سماعات بلوتوث لاسلكية")).toBe(true);
    expect(isAccessory("Charger 25W fast")).toBe(true);
    expect(isAccessory("جراب سيليكون")).toBe(true);
  });

  it("keeps a phone, even bundled with a free accessory", () => {
    expect(isAccessory("Samsung Galaxy A56 5G 256GB")).toBe(false);
    expect(isAccessory("Huawei nova 12 + سماعات هدية")).toBe(false);
    expect(isAccessory("هاتف ريلمي C55")).toBe(false);
    expect(isAccessory("iPhone 15 Pro Max")).toBe(false);
  });
});
