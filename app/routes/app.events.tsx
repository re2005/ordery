import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import shopify from "../shopify.server";
import { getRecentEvents } from "../models/events.server";
import { Page, Card, DataTable, Text } from "@shopify/polaris";

export async function loader({ request }: LoaderFunctionArgs) {
  // ensures embedded/authenticated context
  const { session } = await shopify.authenticate.admin(request);
  const shop = session.shop;
  const rows = await getRecentEvents(shop, 25);

  return { rows };
}

export default function EventsPage() {
  const { rows } = useLoaderData<typeof loader>();
  const tableRows = rows.map((e: any) => [
    e.name,
    e.orderId,
    new Date(e.orderCreatedAt).toLocaleString(),
    e.email ?? "—",
  ]);

  return (
    <Page title="Recent order webhooks">
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Order", "Order ID", "Order Created At", "Email"]}
          rows={tableRows}
        />
        <Text as="p" variant="bodySm" tone="subdued">
          Showing last {rows.length} events.
        </Text>
      </Card>
    </Page>
  );
}
