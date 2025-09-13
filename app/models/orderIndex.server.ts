import prisma from "../db.server";

export async function upsertOrderIndex(data: {
  id: string;
  shop: string;
  name: string;
  createdAt: Date;
  addressHash: string;
  emailHash?: string | null;
  status?: string;
}) {
  const status = data.status || "open";
  return prisma.orderIndex.upsert({
    where: { id: data.id },
    update: { ...data, status },
    create: { ...data, status },
  });
}

export async function findRecentByAddress(
  shop: string,
  addressHash: string,
  since: Date,
) {
  return prisma.orderIndex.findMany({
    where: {
      shop,
      addressHash,
      createdAt: { gte: since },
      // Include merged orders so that a newly created merged order can be
      // considered again if another fresh order arrives within the window.
      // We still exclude only orders marked as 'replaced' (actively being merged)
      // in the detector's in-memory filter.
      status: { in: ["open", "replaced", "merged"] },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markOrdersReplaced(ids: string[], groupId: string) {
  return prisma.orderIndex.updateMany({
    where: { id: { in: ids } },
    data: { status: "replaced", mergedGroupId: groupId },
  });
}

export async function getOrderNamesByIds(ids: string[]) {
  const orders = await prisma.orderIndex.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  // Create a map for easy lookup
  const orderMap = new Map(orders.map((order: any) => [order.id, order.name]));

  // Return names in the same order as the input IDs
  return ids.map((id) => orderMap.get(id) || id);
}
