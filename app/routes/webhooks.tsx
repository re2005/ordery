import type { ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";
import { saveOrderEvent } from "../models/events.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await shopify.authenticate.webhook(request);

  if (topic === "ORDERS_CREATE") {
    await saveOrderEvent(shop, payload);
    return new Response("ok", { status: 200 });
  }

  if (topic === "ORDERS_UPDATED") {
    console.log("RENO: ORDERS_UPDATED");
  }

  return new Response("Unhandled", { status: 404 });
};
