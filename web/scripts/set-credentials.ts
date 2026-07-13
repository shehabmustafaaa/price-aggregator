/** Change an account's email and/or password.
 *  Run:
 *    npx tsx scripts/set-credentials.ts <current-email> --password <new>
 *    npx tsx scripts/set-credentials.ts <current-email> --email <new>
 *    npx tsx scripts/set-credentials.ts <current-email> --email <new> --password <new>
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const currentEmail = (process.argv[2] || "").trim().toLowerCase();
  const newEmail = flag("email")?.trim().toLowerCase();
  const newPassword = flag("password");

  if (!currentEmail || (!newEmail && !newPassword)) {
    throw new Error(
      "usage: set-credentials.ts <current-email> [--email <new>] [--password <new>]",
    );
  }

  const user = await prisma.user.findUnique({ where: { email: currentEmail } });
  if (!user) throw new Error(`no account with email ${currentEmail}`);

  const data: { email?: string; passwordHash?: string } = {};
  if (newEmail) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      throw new Error("new email is not valid");
    }
    const clash = await prisma.user.findUnique({ where: { email: newEmail } });
    if (clash && clash.id !== user.id) {
      throw new Error(`email ${newEmail} is already used by another account`);
    }
    data.email = newEmail;
  }
  if (newPassword) {
    if (newPassword.length < 8) throw new Error("password must be 8+ characters");
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({ where: { id: user.id }, data });
  console.log(
    `updated account #${user.id}: ${[
      data.email ? `email -> ${data.email}` : null,
      data.passwordHash ? "password changed" : null,
    ]
      .filter(Boolean)
      .join(", ")}`,
  );
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
