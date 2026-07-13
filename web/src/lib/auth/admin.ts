import { getSessionUser } from "./session";

/** The session user if they are an admin, else null. Admin pages and admin
 *  server actions gate on this — admins are ordinary accounts (logged in via
 *  /account) with the isAdmin flag set (see scripts/make-admin.ts). */
export async function getAdminUser() {
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("forbidden");
  return admin;
}
