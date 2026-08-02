import { describe, it, expect } from "vitest";
import { isPriceSane } from "./sanity";

// isPriceSane only reads Number(existing.price); build a correctly-typed
// stand-in for the Prisma Decimal-typed `price` field from a plain number.
type Existing = NonNullable<Parameters<typeof isPriceSane>[0]>;
const ex = (price: number): Existing =>
  ({ price }) as unknown as Existing;

describe("isPriceSane", () => {
  it("accepts a first sighting (no existing offer)", () => {
    expect(isPriceSane(null, 10000)).toBe(true);
  });

  it("accepts a change within ±60%", () => {
    expect(isPriceSane(ex(10000), 15000)).toBe(true); // +50%
    expect(isPriceSane(ex(10000), 5000)).toBe(true); // -50%
    expect(isPriceSane(ex(10000), 16000)).toBe(true); // +60% edge
  });

  it("rejects a jump beyond ±60%", () => {
    expect(isPriceSane(ex(10000), 17000)).toBe(false); // +70%
    expect(isPriceSane(ex(10000), 3000)).toBe(false); // -70%
  });

  it("rejects a non-positive new price", () => {
    expect(isPriceSane(ex(10000), 0)).toBe(false);
    expect(isPriceSane(null, -1)).toBe(false);
  });
});
