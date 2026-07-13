/** One-off: tidy verbose auto-created product names IN PLACE — strip Unicode
 *  directional marks, a leading "هاتف", and trailing bundle/spec clauses
 *  ("مع … هدية", "+ …", "، سعة…", "- …", "ثنائي الشريحة …"). Only applies when
 *  it meaningfully shortens the name; never pulls from offer titles (those are
 *  often verbose bundles). Slugs unchanged. Pass --dry to preview.
 *  Run: npx tsx scripts/rederive-names.ts [--dry] */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const dry = process.argv.includes("--dry");

function cleanName(name: string): string {
  let n = name
    .replace(/[‎‏⁦-⁩‪-‮]/g, "") // directional marks
    .replace(/^هاتف\s+/u, "")
    .split(/\s+[-–]\s+/)[0] // "- color/variant"
    .split(/ \+ /)[0] // " + bundle" (spaces required — keeps "Pro+", "(8+256)")
    .replace(/\s+مع\s.*/u, "") // "with … (gift)"
    .split(/[،,]/)[0] // spec clauses
    .replace(/\s+ثنائي الشريحه.*/u, "")
    .replace(/\s+ثنائي الشريحة.*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return n;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, nameEn: true, nameAr: true },
  });

  let updated = 0;
  for (const p of products) {
    const en = cleanName(p.nameEn);
    const ar = cleanName(p.nameAr);
    // Only apply when it actually shortens something and stays non-trivial.
    const enOk = en.length >= 3 && en.length < p.nameEn.length ? en : p.nameEn;
    const arOk = ar.length >= 3 && ar.length < p.nameAr.length ? ar : p.nameAr;
    if (enOk === p.nameEn && arOk === p.nameAr) continue;

    if (dry) {
      console.log(`#${p.id}: "${p.nameEn.slice(0, 50)}" -> "${enOk.slice(0, 50)}"`);
    } else {
      await prisma.product.update({
        where: { id: p.id },
        data: { nameEn: enOk, nameAr: arOk },
      });
    }
    updated++;
  }
  console.log(`${dry ? "would update" : "updated"} ${updated} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
