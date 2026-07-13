"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { changePassword, registerUser, verifyUser } from "@/lib/auth/user";
import { createSession, destroySession, getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type AuthState = { error?: string } | undefined;
export type ChangePwState = { error?: string; ok?: boolean } | undefined;

export async function changePasswordAction(
  _prev: ChangePwState,
  formData: FormData,
): Promise<ChangePwState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "not_signed_in" };
  try {
    await changePassword(
      userId,
      String(formData.get("current") || ""),
      String(formData.get("next") || ""),
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "error" };
  }
  return { ok: true };
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") || "ar");
  try {
    const user = await registerUser(
      String(formData.get("email") || ""),
      String(formData.get("password") || ""),
      locale,
    );
    await createSession(user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "error" };
  }
  redirect(`/${locale}/account`);
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const locale = String(formData.get("locale") || "ar");
  const user = await verifyUser(
    String(formData.get("email") || ""),
    String(formData.get("password") || ""),
  );
  if (!user) return { error: "bad_credentials" };
  await createSession(user.id);
  redirect(`/${locale}/account`);
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") || "ar");
  await destroySession();
  redirect(`/${locale}`);
}

export async function deleteAlertAction(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) return;
  await prisma.priceAlert.deleteMany({
    where: { id: Number(formData.get("alertId")), userId },
  });
  revalidatePath("/account");
}

export async function removeFavoriteAction(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) return;
  await prisma.favorite.deleteMany({
    where: { productId: Number(formData.get("productId")), userId },
  });
  revalidatePath("/account");
}
