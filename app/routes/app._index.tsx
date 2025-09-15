import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import shopify from "../shopify.server";
import {
  getPendingMergeGroups,
  getCompletedMergeCount,
  getDraftMergeCount,
} from "../models/mergeGroup.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);

  // Get pending merges count
  const pendingMerges = await getPendingMergeGroups(session.shop);

  // Get total completed merges count
  const completedCount = await getCompletedMergeCount(session.shop);

  // Get total draft merges count
  const draftCount = await getDraftMergeCount(session.shop);

  return {
    shop: session.shop,
    pendingCount: pendingMerges.length,
    completedCount,
    draftCount,
  };
}

export default function Index() {
  const { pendingCount, completedCount, draftCount } =
    useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Ordery"></TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Ordery Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Automatic order merging for duplicate purchases from the
                    same customer.
                  </Text>
                </BlockStack>

                {pendingCount > 0 && (
                  <Card background="bg-surface-caution">
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="h3" variant="headingSm">
                          Pending Merges Require Attention
                        </Text>
                        <Badge tone="attention">
                          {pendingCount.toString()}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        You have {pendingCount} potential merge
                        {pendingCount === 1 ? "" : "s"} waiting for manual
                        review.
                      </Text>
                      <InlineStack align="start">
                        <Link to="/app/pending">
                          <Button variant="primary" size="micro">
                            Review Pending Merges
                          </Button>
                        </Link>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      Pending Merges
                    </Text>
                    <Text as="p" variant="headingLg">
                      {pendingCount}
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Awaiting manual review
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      Draft Orders
                    </Text>
                    <Text as="p" variant="headingLg">
                      {draftCount}
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Created but not completed
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      Completed Merges
                    </Text>
                    <Text as="p" variant="headingLg">
                      {completedCount}
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Successfully merged orders
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
