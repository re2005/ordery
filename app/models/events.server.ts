import prisma from "../db.server";
import crypto from "crypto";

type ShippingAddress = {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  state?: string;
  zip?: string;
  postal_code?: string;
  country_code?: string;
  country?: string;
};

function normalizeAddress(addr?: ShippingAddress): string {
  if (!addr) return "";
  const clean = (s = "") =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "");
  return [
    clean(addr.name),
    clean((addr.address1 || "") + (addr.address2 || "")),
    clean(addr.city),
    clean(addr.province || addr.state || ""),
    clean(addr.zip || addr.postal_code || ""),
    clean(addr.country_code || addr.country || ""),
  ].join("|");
}

function hashAddress(addr?: ShippingAddress) {
  const norm = normalizeAddress(addr);
  if (!norm) return null;
  return crypto.createHash("sha1").update(norm).digest("hex");
}

export async function saveOrderEvent(shop: string, order: any) {
  const shipping = {
    name: order?.shipping_address?.name,
    address1: order?.shipping_address?.address1,
    address2: order?.shipping_address?.address2,
    city: order?.shipping_address?.city,
    province: order?.shipping_address?.province,
    state: order?.shipping_address?.state,
    zip: order?.shipping_address?.zip,
    postal_code: order?.shipping_address?.postal_code,
    country_code: order?.shipping_address?.country_code,
    country: order?.shipping_address?.country,
  };

  const data = {
    shop,
    orderId: String(order.id),
    name: order.name ?? "",
    orderCreatedAt: new Date(order.created_at ?? Date.now()),
    email: (order.email || "").toLowerCase() || null,
    shippingAddrHash: hashAddress(shipping),
    // keep raw tiny in dev to inspect payload shape; avoid storing PII at scale
    raw: {
      id: order.id,
      name: order.name,
      line_items_count: Array.isArray(order.line_items)
        ? order.line_items.length
        : 0,
      total_price: order.total_price,
      email: order.email ? true : false, // don’t store raw email again
    } as any,
  };

  // idempotency: if Shopify retries, upsert by (shop, orderId)
  try {
    await prisma.orderEvent.upsert({
      where: { shop_orderId: { shop: data.shop, orderId: data.orderId } },
      update: data,
      create: data,
    });
    console.log("[persist] upsert ok");
  } catch (err: any) {
    console.error("[persist] upsert failed", err?.message, err);
  }
}

export async function getRecentEvents(shop: string, limit = 25) {
  return prisma.orderEvent.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
