import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import shopify from "../shopify.server";
import { Page, Card, DataTable, BlockStack, Text } from "@shopify/polaris";
import { getMergedGroups } from "../models/mergeGroup.server";
import { getOrderNamesByIds } from "../models/orderIndex.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const groups = await getMergedGroups(session.shop, 50);

  // Enhance merged groups with order names
  const enhancedGroups = await Promise.all(
    groups.map(async (group: any) => {
      const orderNames = await getOrderNamesByIds(group.originalIds);
      return {
        ...group,
        orderNames,
      };
    }),
  );

  return { groups: enhancedGroups };
}

export default function MergedPage() {
  const { groups } = useLoaderData<typeof loader>();

  const rows = groups.map((g: any) => [
    g.status === "completed"
      ? "Completed"
      : g.status === "draft_created"
        ? "Draft Created"
        : g.status === "failed"
          ? "Failed"
          : g.status,
    g.reason === "both"
      ? "Address + Email"
      : g.reason === "email_hash"
        ? "Email"
        : g.reason === "address_hash"
          ? "Address"
          : g.reason,
    g.orderNames ? g.orderNames.join(", ") : g.originalIds.join(", "),
    g.originalIds.length,
    g.newOrderId?.split("/").pop() || "—",
    new Date(g.createdAt).toLocaleString(),
  ]);

  return (
    <Page
      title="Merged Orders"
      subtitle={`${groups.length} recent merge operations`}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Card>
        {groups.length === 0 ? (
          <BlockStack gap="400">
            <Text as="p" alignment="center" tone="subdued">
              No merged orders yet. Orders will appear here after successful
              merges.
            </Text>
          </BlockStack>
        ) : (
          <DataTable
            columnContentTypes={[
              "text",
              "text",
              "text",
              "numeric",
              "text",
              "text",
            ]}
            headings={[
              "Status",
              "Match Type",
              "Original Order IDs",
              "Count",
              "New Order ID",
              "Created",
            ]}
            rows={rows}
          />
        )}
      </Card>
    </Page>
  );
}
