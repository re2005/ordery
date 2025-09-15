// app/routes/compliance-webhooks.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import prisma from "../db.server";

// Payload interfaces per Shopify privacy compliance docs
interface CustomersDataRequestPayload {
  shop_id: number;
  shop_domain: string;
  customer: { id: number; email?: string; phone?: string };
  orders_requested?: number[]; // array of numeric order IDs
}

interface CustomersRedactPayload {
  shop_id: number;
  shop_domain: string;
  customer: { id: number; email?: string };
  orders_to_redact?: number[];
}

interface ShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

async function verifyShopifyWebhook(request: Request, secret: string) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const safeEqual =
    hmacHeader.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));

  return { ok: safeEqual, rawBody };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!process.env.SHOPIFY_API_SECRET) {
    return json({ error: "Server misconfiguration" }, { status: 500 });
  }
  try {
    const { ok, rawBody } = await verifyShopifyWebhook(
      request,
      process.env.SHOPIFY_API_SECRET,
    );
    if (!ok) return new Response("Unauthorized", { status: 401 });

    const topic = request.headers.get("X-Shopify-Topic") || "";
    const shop = (
      request.headers.get("X-Shopify-Shop-Domain") || ""
    ).toLowerCase();
    const payload = JSON.parse(rawBody);

    switch (topic) {
      case "customers/data_request": {
        const data = await handleCustomerDataRequest(
          payload as CustomersDataRequestPayload,
          shop,
        );
        return json({ ok: true, data });
      }
      case "customers/redact": {
        await handleCustomerRedact(payload as CustomersRedactPayload, shop);
        return json({ ok: true });
      }
      case "shop/redact": {
        await handleShopRedact(payload as ShopRedactPayload, shop);
        return json({ ok: true });
      }
      default:
        console.warn("[compliance] Unhandled topic", topic);
        return json({ ok: true }); // acknowledge regardless
    }
  } catch (err) {
    console.error("[compliance] webhook error", err);
    return json({ error: "Internal Error" }, { status: 500 });
  }
};

// Example stubs
async function handleCustomerDataRequest(
  payload: CustomersDataRequestPayload,
  shop: string,
) {
  const numericIds = payload.orders_requested || [];
  const gids = numericIds.map((id) => `gid://shopify/Order/${id}`);
  if (!gids.length)
    return { shop, customer_id: payload.customer.id, orders: [] };

  const orders = await prisma.orderIndex.findMany({
    where: { shop, id: { in: gids } },
    select: {
      id: true,
      name: true,
      createdAt: true,
      status: true,
      mergedGroupId: true,
    },
  });
  return {
    shop,
    customer_id: payload.customer.id,
    orders: orders.map((o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      status: o.status,
      mergedGroupId: o.mergedGroupId,
    })),
    note: "Only hashed customer identifiers are stored; no raw PII retained.",
  };
}
async function handleCustomerRedact(payload: any, shop: string) {
  const p = payload as CustomersRedactPayload;
  // We only store order index rows (hashed identifiers). For redaction we can
  // remove rows related to specific orders. If only customer id provided with no
  // orders, we have no direct linkage (no raw customer id/email stored), so we simply
  // do nothing and log.
  const orderIds = p.orders_to_redact || [];
  if (!orderIds.length) {
    console.info(
      "[compliance] customers/redact no orders supplied; nothing to delete",
    );
    return;
  }
  const gids = orderIds.map((id) => `gid://shopify/Order/${id}`);
  const deleted = await prisma.orderIndex.deleteMany({
    where: { shop, id: { in: gids } },
  });
  console.info(
    `[compliance] customers/redact removed ${deleted.count} orderIndex rows for shop=${shop}`,
  );
}
async function handleShopRedact(payload: any, shop: string) {
  const p = payload as ShopRedactPayload;
  // Remove all data this app stored about the shop.
  const [orders, groups, settings, sessions] = await Promise.all([
    prisma.orderIndex.deleteMany({ where: { shop } }),
    prisma.mergeGroup.deleteMany({ where: { shop } }),
    prisma.shopSettings.deleteMany({ where: { shop } }),
    prisma.session.deleteMany({ where: { shop } }),
  ]);
  console.info(
    `[compliance] shop/redact purged shop=${shop} counts orderIndex=${orders.count} mergeGroup=${groups.count} settings=${settings.count} sessions=${sessions.count}`,
  );
}
