import { cookies } from "next/headers";

const COOKIE = "shtiebel_admin";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "morahmikdush";
}

export async function isAdminAuthed() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token === getAdminPassword();
}

export function adminCookieName() {
  return COOKIE;
}
