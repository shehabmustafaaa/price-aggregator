/** Grant/create an admin account.
 *  Run: npx tsx scripts/make-admin.ts <email> [password]
 *  - existing user: promotes them to admin.
 *  - new user (password given): creates an admin account. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3];
  if (!email) throw new Error("usage: make-admin.ts <email> [password]");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { isAdmin: true } });
    console.log(`promoted ${email} to admin`);
    return;
  }
  if (!password) {
    throw new Error(`no user ${email}; pass a password to create an admin`);
  }
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      isAdmin: true,
    },
  });
  console.log(`created admin ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
