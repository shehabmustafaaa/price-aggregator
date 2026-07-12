"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function setAlertAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const slug = String(formData.get("slug") || "");
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/account`);

  const productId = Number(formData.get("productId"));
  const targetPrice = Number(formData.get("targetPrice"));
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return;

  const existing = await prisma.priceAlert.findFirst({
    where: { userId, productId, active: true },
  });
  if (existing) {
    await prisma.priceAlert.update({
      where: { id: existing.id },
      data: { targetPrice },
    });
  } else {
    await prisma.priceAlert.create({
      data: { userId, productId, targetPrice },
    });
  }
  revalidatePath(`/${locale}/p/${slug}`);
}

export async function toggleFavoriteAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  const slug = String(formData.get("slug") || "");
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/account`);

  const productId = Number(formData.get("productId"));
  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.favorite.delete({
      where: { userId_productId: { userId, productId } },
    });
  } else {
    await prisma.favorite.create({ data: { userId, productId } });
  }
  revalidatePath(`/${locale}/p/${slug}`);
}
