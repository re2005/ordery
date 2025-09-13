import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";
import { detectAndMaybeGroup } from "../services/detector.server";
import { performMerge } from "../services/merge.server";
import { getSettings } from "../models/settings.server";

export const loader = async (_: LoaderFunctionArgs) =>
  new Response("Webhook endpoint. Use POST.", { status: 200 });

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("[webhook] incoming", request.headers.get("x-shopify-topic"));
  const { topic, shop, payload } = await shopify.authenticate.webhook(request);

  if (topic === "ORDERS_CREATE") {
    const group = await detectAndMaybeGroup(shop, payload);
    if (group) {
      const { admin } = await shopify.unauthenticated.admin(shop);
      const settings = await getSettings(shop);
      if (settings.autoCompleteDraft) {
        await performMerge(admin, shop, {
          id: group.id,
          originalIds: group.originalIds,
        });
      }
    }
  }
  return new Response("ok", { status: 200 });
};
