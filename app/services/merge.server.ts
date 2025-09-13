import { setDraft, setCompleted, setFailed } from "../models/mergeGroup.server";
import {
  markOrdersReplaced,
  upsertOrderIndex,
} from "../models/orderIndex.server";
import { getSettings } from "../models/settings.server";
import { hashAddress, hashEmail } from "../lib/hash.server";

// Minimal GQL helpers
async function gq(admin: any, query: string, variables?: any) {
  const resp = await admin.graphql(
    query,
    variables ? { variables } : undefined,
  );
  return resp.json();
}

async function fetchOrders(admin: any, ids: string[]) {
  // Convert numeric IDs to GraphQL Global IDs
  const globalIds = ids.map((id) => {
    // If already a global ID, return as-is, otherwise convert
    return id.startsWith("gid://") ? id : `gid://shopify/Order/${id}`;
  });

  const q = `#graphql
    query($ids:[ID!]!) {
      nodes(ids:$ids) {
        ... on Order {
          id name email
          cancelledAt
          displayFinancialStatus
          displayFulfillmentStatus
          shippingAddress { name address1 address2 city province zip countryCodeV2 }
          tags
          customAttributes { key value }
          lineItems(first: 100) { edges { node { quantity variant { id } title } } }
        }
      }
    }`;
  const j = await gq(admin, q, { ids: globalIds });
  return (j.data.nodes || []).filter(Boolean).map((n: any) => ({
    id: n.id,
    name: n.name,
    email: n.email,
    cancelledAt: n.cancelledAt,
    displayFinancialStatus: n.displayFinancialStatus,
    displayFulfillmentStatus: n.displayFulfillmentStatus,
    shippingAddress: n.shippingAddress,
    tags: n.tags,
    customAttributes: n.customAttributes,
    lineItems: n.lineItems.edges.map((e: any) => ({
      quantity: e.node.quantity,
      variantId: e.node.variant?.id,
      title: e.node.title,
    })),
    isMergedOrder: (n.tags || []).includes("MERGED"),
    isCancelled: !!n.cancelledAt || n.displayFinancialStatus === "CANCELLED",
  }));
}

async function draftCreate(admin: any, input: any) {
  const m = `#graphql
    mutation($input: DraftOrderInput!) {
      draftOrderCreate(input:$input) {
        draftOrder { id name invoiceUrl }
        userErrors { field message }
      }
    }`;
  return gq(admin, m, { input });
}

async function draftComplete(admin: any, id: string) {
  const m = `#graphql
    mutation($id: ID!) {
      draftOrderComplete(id:$id) {
        draftOrder { id order { id name } }
        userErrors { field message }
      }
    }`;
  return gq(admin, m, { id });
}

async function orderTag(
  admin: any,
  id: string,
  tags: string[],
  customAttributes: any[],
) {
  // Convert numeric ID to GraphQL Global ID if needed
  const globalId = id.startsWith("gid://") ? id : `gid://shopify/Order/${id}`;

  const m = `#graphql
    mutation($input: OrderInput!) {
      orderUpdate(input:$input) {
        order { id }
        userErrors { field message }
      }
    }`;
  return gq(admin, m, { input: { id: globalId, tags, customAttributes } });
}

export async function performMerge(
  admin: any,
  shop: string,
  group: { id: string; originalIds: string[] },
  isManualMerge = false,
) {
  try {
    const settings = await getSettings(shop);
    console.log("Shop settings:", settings);

    const orders = await fetchOrders(admin, group.originalIds);
    console.log("Fetched orders:", orders.length, "orders");

    if (orders.length === 0) {
      throw new Error("No orders found to merge");
    }

    // Filter out cancelled orders
    const validOrders = orders.filter((o: any) => !o.isCancelled);
    const cancelledOrders = orders.filter((o: any) => o.isCancelled);

    if (cancelledOrders.length > 0) {
      console.log(
        `[merge] Excluding ${cancelledOrders.length} cancelled orders:`,
        cancelledOrders.map((o: any) => o.name),
      );
    }

    if (validOrders.length === 0) {
      throw new Error("All orders are cancelled - cannot merge");
    }

    if (validOrders.length === 1) {
      throw new Error(
        "Only one valid order found after excluding cancelled orders - cannot merge",
      );
    }

    // Check if any of the orders are already merged orders
    const mergedOrders = validOrders.filter((o: any) => o.isMergedOrder);
    const newOrders = validOrders.filter((o: any) => !o.isMergedOrder);

    if (mergedOrders.length > 0) {
      console.log(
        `[merge] Found ${mergedOrders.length} existing merged orders and ${newOrders.length} new orders`,
      );
      // If we're merging with existing merged orders, we need to:
      // 1. Cancel/mark the old merged orders as replaced
      // 2. Create a new merged order with all items combined

      // For now, we'll proceed with the normal merge process which will combine all line items
      // The old merged order will be tagged as "REPLACED" and "MERGED" again
    }

    // Aggregate items
    const map = new Map<
      string,
      { variantId?: string; title: string; quantity: number }
    >();
    for (const o of validOrders) {
      for (const li of o.lineItems) {
        const key = li.variantId || li.title;
        const curr = map.get(key) || {
          variantId: li.variantId,
          title: li.title,
          quantity: 0,
        };
        curr.quantity += li.quantity;
        map.set(key, curr);
      }
    }
    const lineItems = [...map.values()].map(
      (v) =>
        v.variantId
          ? { variantId: v.variantId, quantity: v.quantity }
          : { title: v.title, quantity: v.quantity }, // fallback if variant missing
    );

    console.log("Aggregated line items:", lineItems);

    if (lineItems.length === 0) {
      throw new Error("No line items found to merge");
    }

    const base = validOrders[validOrders.length - 1]; // most recent as base

    // Map shipping address to correct format for DraftOrderInput
    const shippingAddress = base.shippingAddress
      ? {
          address1: base.shippingAddress.address1,
          address2: base.shippingAddress.address2,
          city: base.shippingAddress.city,
          province: base.shippingAddress.province,
          zip: base.shippingAddress.zip,
          countryCode: base.shippingAddress.countryCodeV2,
          firstName: base.shippingAddress.name?.split(" ")[0] || "",
          lastName:
            base.shippingAddress.name?.split(" ").slice(1).join(" ") || "",
        }
      : undefined;

    const input = {
      email: base.email,
      shippingAddress,
      lineItems,
      tags: ["MERGED"],
      customAttributes: [
        {
          key: "MergedFrom",
          value: validOrders
            .map((o: any) => {
              // If this order was already merged, get its original merged-from value
              const existingMergedFrom = o.customAttributes?.find(
                (attr: any) => attr.key === "MergedFrom",
              )?.value;
              return existingMergedFrom || o.name;
            })
            .join(", "),
        },
      ],
    };

    console.log("Draft order input:", JSON.stringify(input, null, 2));
    const dc = await draftCreate(admin, input);
    console.log("Draft create response:", JSON.stringify(dc, null, 2));

    const draftId = dc?.data?.draftOrderCreate?.draftOrder?.id;
    if (!draftId) {
      const errors = dc?.data?.draftOrderCreate?.userErrors || [];
      console.error("Draft creation failed:", errors);
      throw new Error(
        JSON.stringify(errors.length > 0 ? errors : "draft create failed"),
      );
    }

    console.log("Draft order created:", draftId);
    await setDraft(group.id, draftId);

    let newOrderId: string | undefined;
    // For manual merges, always complete the draft. For automatic merges, respect the setting
    const shouldCompleteDraft = isManualMerge || settings.autoCompleteDraft;

    if (shouldCompleteDraft) {
      console.log(
        isManualMerge
          ? "Manual merge: completing draft order"
          : "Auto-completing draft order:",
        draftId,
      );
      const comp = await draftComplete(admin, draftId);
      newOrderId = comp?.data?.draftOrderComplete?.draftOrder?.order?.id;
      if (!newOrderId) {
        const errors = comp?.data?.draftOrderComplete?.userErrors || [];
        console.error("Draft completion failed:", errors);
        throw new Error(
          JSON.stringify(errors.length > 0 ? errors : "draft complete failed"),
        );
      }
      console.log("Draft completed, new order created:", newOrderId);
    } else {
      console.log(
        "Draft order created but not auto-completed (autoCompleteDraft=false)",
      );
    }

    // Tag originals (only valid orders, not cancelled ones)
    for (const o of validOrders) {
      const tags = Array.from(
        new Set([...(o.tags || []), "REPLACED", "MERGED"]),
      );
      const existingMergedFrom = o.customAttributes?.find(
        (attr: any) => attr.key === "MergedFrom",
      )?.value;
      const newMergedFrom = validOrders
        .map((order: any) => order.name)
        .join(", ");
      const notes = [
        ...(o.customAttributes || []).filter(
          (attr: any) => attr.key !== "MergedFrom" && attr.key !== "MergedInto",
        ),
        { key: "MergedInto", value: newOrderId || draftId },
        {
          key: "MergedFrom",
          value: existingMergedFrom
            ? `${existingMergedFrom}, ${newMergedFrom}`
            : newMergedFrom,
        },
      ];
      await orderTag(admin, o.id, tags, notes);
    }

    // Orders are already marked as replaced in the detector, no need to do it again
    if (newOrderId) await setCompleted(group.id, newOrderId);

    // Index the newly created merged order so it can be found for future merges
    const mergedOrderId = newOrderId || draftId;
    const mergedOrderName = newOrderId
      ? `#${newOrderId.split("/").pop()}` // Extract order number from GID
      : `Draft-${draftId.split("/").pop()}`; // Extract draft number from GID

    console.log(
      `[merge] About to index merged order: ID=${mergedOrderId}, Name=${mergedOrderName}`,
    );

    // Use the base order's address and email for indexing
    const addressHash = await hashAddress(shop, base.shippingAddress);
    const emailHash = await hashEmail(shop, base.email);

    console.log(
      `[merge] Address hash: ${addressHash.slice(0, 8)}..., Email hash: ${emailHash?.slice(0, 8) || "none"}...`,
    );

    await upsertOrderIndex({
      id: mergedOrderId,
      shop,
      name: mergedOrderName,
      createdAt: new Date(),
      addressHash,
      emailHash,
      status: "merged",
    });

    console.log(
      `[merge] Successfully indexed merged order ${mergedOrderId} with status 'merged'`,
    );

    return { ok: true, draftId, newOrderId };
  } catch (e: any) {
    await setFailed(group.id, String(e?.message || e));
    return { ok: false, error: e?.message || String(e) };
  }
}
