import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function registerUser(
  email: string,
  password: string,
  locale: string,
) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error("invalid_email");
  }
  if (password.length < 8) throw new Error("weak_password");
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) throw new Error("email_taken");
  return prisma.user.create({
    data: {
      email: normalized,
      passwordHash: await bcrypt.hash(password, 10),
      locale,
    },
  });
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new Error("no_password");
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new Error("wrong_current");
  }
  if (newPassword.length < 8) throw new Error("weak_password");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
}
