import prisma from "../db.server";

export async function getSettings(shop: string) {
  let s = await prisma.shopSettings.findUnique({ where: { shop } });
  if (!s) {
    s = await prisma.shopSettings.create({ data: { shop } });
  }
  return s;
}

export async function updateSettings(
  shop: string,
  patch: Partial<{
    windowMinutes: number;
    byAddress: boolean;
    byEmail: boolean;
    requireBoth: boolean;
    autoCompleteDraft: boolean;
  }>,
) {
  return prisma.shopSettings.update({
    where: { shop },
    data: patch,
  });
}
