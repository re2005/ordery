import { getSettings } from "../models/settings.server";
import {
  upsertOrderIndex,
  findRecentByAddress,
  markOrdersReplaced,
} from "../models/orderIndex.server";
import { hashAddress, hashEmail } from "../lib/hash.server";
import { createMergeGroup } from "../models/mergeGroup.server";

export type MatchRules = {
  windowMinutes: number;
  byAddress: boolean;
  byEmail: boolean;
  requireBoth: boolean;
};

function within(a: Date, b: Date, minutes: number) {
  return Math.abs(+a - +b) <= minutes * 60_000;
}

export async function detectAndMaybeGroup(shop: string, order: any) {
  // 0) Check if this order is cancelled - ignore cancelled orders
  const isCancelled =
    !!order.cancelledAt ||
    order.cancelled_at ||
    order.displayFinancialStatus === "CANCELLED" ||
    order.display_financial_status === "cancelled" ||
    order.financial_status === "cancelled";

  if (isCancelled) {
    console.log(
      `[detector] Ignoring cancelled order ${order.name || order.id}`,
    );
    return null;
  }

  // 1) Check if this is a merged order created by the app - ignore it to prevent infinite loops
  const tags = order.tags || [];
  const customAttributes =
    order.customAttributes || order.custom_attributes || [];

  const isMergedOrder =
    tags.includes("MERGED") ||
    customAttributes.some((attr: any) => attr.key === "MergedFrom");

  if (isMergedOrder) {
    console.log(
      `[detector] Ignoring merged order ${order.name || order.id} to prevent infinite loop`,
    );

    // Still index the merged order but mark it as merged status
    const createdAt = new Date(order.createdAt || order.created_at);
    const addressHash = await hashAddress(
      shop,
      order.shippingAddress || order.shipping_address,
    );
    const emailHash = await hashEmail(shop, order.email);

    // Index the merged order with 'merged' status to prevent future matching
    await upsertOrderIndex({
      id: order.id.toString(),
      shop,
      name: order.name,
      createdAt,
      addressHash,
      emailHash,
      status: "merged",
    });

    return null;
  }

  // 1) Load rules
  const s = await getSettings(shop);
  const rules: MatchRules = {
    windowMinutes: s.windowMinutes,
    byAddress: s.byAddress,
    byEmail: s.byEmail,
    requireBoth: s.requireBoth,
  };

  // 2) Build index doc with hashes
  const createdAt = new Date(order.createdAt || order.created_at);
  const addressHash = await hashAddress(
    shop,
    order.shippingAddress || order.shipping_address,
  );
  const emailHash = await hashEmail(shop, order.email);

  await upsertOrderIndex({
    id: order.id.toString(),
    shop,
    name: order.name,
    createdAt,
    addressHash,
    emailHash,
  });

  // 3) Find recent candidates (address is the primary key)
  const since = new Date(Date.now() - rules.windowMinutes * 60_000);
  const recent = await findRecentByAddress(shop, addressHash, since);

  console.log(
    `[detector] Found ${recent.length} recent orders for address hash ${addressHash.slice(0, 8)}... since ${since.toISOString()}`,
  );
  console.log(
    `[detector] Recent orders:`,
    recent.map((r: any) => ({
      name: r.name,
      status: r.status,
      createdAt: r.createdAt,
    })),
  );

  // 4) Filter by rule combination and exclude orders already being processed
  const matched = recent.filter((r: any) => {
    // Include merged orders as candidates (they can be merged again with new orders)
    // But exclude orders that are currently being replaced (in pending merge groups)
    if (r.status === "replaced") {
      console.log(`[detector] Excluding order ${r.name} - status: replaced`);
      return false;
    }

    const byAddr = rules.byAddress && r.addressHash === addressHash;
    const byEmail = rules.byEmail && !!emailHash && r.emailHash === emailHash;
    const logic = rules.requireBoth ? byAddr && byEmail : byAddr || byEmail;
    const timeMatch = within(
      new Date(r.createdAt),
      createdAt,
      rules.windowMinutes,
    );

    console.log(
      `[detector] Checking order ${r.name}: byAddr=${byAddr}, byEmail=${byEmail}, logic=${logic}, timeMatch=${timeMatch}, status=${r.status}`,
    );

    return logic && timeMatch;
  });

  console.log(
    `[detector] Found ${matched.length} potential matches for order ${order.name || order.id}`,
  );
  console.log(
    `[detector] Matched orders:`,
    matched.map((m: any) => ({
      name: m.name,
      status: m.status,
      createdAt: m.createdAt,
    })),
  );

  if (matched.length >= 2) {
    const ids = matched.map((m: any) => m.id);
    console.log(
      `[detector] Creating merge group for orders: ${ids.join(", ")}`,
    );

    const reason =
      rules.requireBoth && rules.byEmail
        ? "both"
        : rules.byEmail
          ? "email_hash"
          : "address_hash";
    const group = await createMergeGroup({
      shop,
      windowMinutes: rules.windowMinutes,
      originalIds: ids,
      reason,
    });

    // Immediately mark these orders as replaced to prevent them from being included in future merge groups
    await markOrdersReplaced(ids, group.id);
    console.log(
      `[detector] Marked orders ${ids.join(", ")} as replaced in group ${group.id}`,
    );

    return group; // caller can enqueue merge(job) if auto-merge is ON
  }

  return null;
}
