import crypto from "crypto";

const SALT_CACHE = new Map<string, string>();

export async function saltForShop(shop: string) {
  if (SALT_CACHE.has(shop)) return SALT_CACHE.get(shop)!;
  const salt = crypto
    .createHash("sha256")
    .update((process.env.HASH_SALT || "dev-salt") + shop)
    .digest("hex");
  SALT_CACHE.set(shop, salt);
  return salt;
}

export function normalizeAddress(a: any) {
  const clean = (s = "") =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "");
  return [
    clean(a?.name),
    clean(`${a?.address1 || ""}${a?.address2 || ""}`),
    clean(a?.city),
    clean(a?.province || a?.state),
    clean(a?.zip || a?.postal_code),
    clean(a?.country_code || a?.country),
  ].join("|");
}

export async function hashAddress(shop: string, addr: any) {
  const salt = await saltForShop(shop);
  return crypto
    .createHmac("sha256", salt)
    .update(normalizeAddress(addr))
    .digest("hex");
}

export async function hashEmail(shop: string, email?: string | null) {
  if (!email) return null;
  const salt = await saltForShop(shop);
  return crypto
    .createHmac("sha256", salt)
    .update(email.toLowerCase().trim())
    .digest("hex");
}
