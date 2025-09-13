import prisma from "../db.server";

export async function createMergeGroup(data: {
  shop: string;
  windowMinutes: number;
  originalIds: string[];
  reason: string;
}) {
  return prisma.mergeGroup.create({
    data: { ...data, status: "pending" },
  });
}

export async function setDraft(groupId: string, draftId: string) {
  return prisma.mergeGroup.update({
    where: { id: groupId },
    data: { draftOrderId: draftId, status: "draft_created" },
  });
}

export async function setCompleted(groupId: string, newOrderId: string) {
  return prisma.mergeGroup.update({
    where: { id: groupId },
    data: { newOrderId, status: "completed" },
  });
}

export async function setFailed(groupId: string, message: string) {
  return prisma.mergeGroup.update({
    where: { id: groupId },
    data: { status: "failed", reason: message },
  });
}

export async function getPendingMergeGroups(shop: string) {
  return prisma.mergeGroup.findMany({
    where: {
      shop,
      status: "pending",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getMergeGroup(id: string) {
  return prisma.mergeGroup.findUnique({
    where: { id },
  });
}

export async function rejectMergeGroup(groupId: string) {
  const group = await prisma.mergeGroup.findUnique({
    where: { id: groupId },
  });

  if (group) {
    // Reset order statuses back to 'open' so they can be considered for future merges
    await prisma.orderIndex.updateMany({
      where: {
        id: { in: group.originalIds },
        mergedGroupId: groupId,
      },
      data: {
        status: "open",
        mergedGroupId: null,
      },
    });
  }

  return prisma.mergeGroup.update({
    where: { id: groupId },
    data: { status: "rejected" },
  });
}

export async function getCompletedMergeCount(shop: string) {
  return prisma.mergeGroup.count({
    where: {
      shop,
      status: "completed",
    },
  });
}

export async function getDraftMergeCount(shop: string) {
  return prisma.mergeGroup.count({
    where: {
      shop,
      status: "draft_created",
    },
  });
}

export async function getMergedGroups(shop: string, limit: number = 50) {
  return prisma.mergeGroup.findMany({
    where: {
      shop,
      status: { in: ["completed", "draft_created", "failed"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
