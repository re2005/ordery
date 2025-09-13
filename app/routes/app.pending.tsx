import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useNavigation,
  useSubmit,
  useActionData,
} from "@remix-run/react";
import shopify from "../shopify.server";
import {
  Page,
  Card,
  Button,
  DataTable,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  Modal,
  TextContainer,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import {
  getPendingMergeGroups,
  getMergeGroup,
  rejectMergeGroup,
} from "../models/mergeGroup.server";
import { getOrderNamesByIds } from "../models/orderIndex.server";
import { performMerge } from "../services/merge.server";

/* ------------------------------ LOADER ------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const pendingMerges = await getPendingMergeGroups(session.shop);

  // Enhance pending merges with order names
  const enhancedMerges = await Promise.all(
    pendingMerges.map(async (group: any) => {
      const orderNames = await getOrderNamesByIds(group.originalIds);
      return {
        ...group,
        orderNames,
      };
    }),
  );

  return json({ shop: session.shop, pendingMerges: enhancedMerges });
}

/* ------------------------------ ACTION ------------------------------ */

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await shopify.authenticate.admin(request);
  const form = await request.formData();
  const action = form.get("action");
  const groupId = form.get("groupId");

  if (!groupId || typeof groupId !== "string") {
    return json(
      { success: false, message: "Missing group ID" },
      { status: 400 },
    );
  }

  const group = await getMergeGroup(groupId);
  if (!group || group.shop !== session.shop) {
    return json(
      { success: false, message: "Group not found" },
      { status: 404 },
    );
  }

  if (action === "approve") {
    try {
      const result = await performMerge(
        admin,
        session.shop,
        {
          id: group.id,
          originalIds: group.originalIds,
        },
        true,
      ); // Pass true to indicate this is a manual merge

      if (result.ok) {
        const message = result.newOrderId
          ? `Merge completed successfully. New order created: ${result.newOrderId}`
          : `Draft order created successfully: ${result.draftId}`;
        return json({ success: true, message });
      } else {
        return json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error("Error performing merge:", error);
      return json({ success: false, message: "Failed to merge orders" });
    }
  } else if (action === "reject") {
    try {
      await rejectMergeGroup(groupId);
      return json({ success: true, message: "Merge rejected" });
    } catch (error) {
      console.error("Error rejecting merge:", error);
      return json({ success: false, message: "Failed to reject merge" });
    }
  }

  return json({ success: false, message: "Invalid action" }, { status: 400 });
}

/* ------------------------------- VIEW ------------------------------- */

export default function PendingMergesPage() {
  const { pendingMerges } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const submit = useSubmit();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const submitting = nav.state === "submitting";

  // Close modal when action completes successfully
  useEffect(() => {
    if (actionData?.success && nav.state === "idle") {
      setSelectedGroup(null);
    }
  }, [actionData, nav.state]);

  const rows = pendingMerges.map((group: any) => [
    `Merge #${group.id.slice(-8)}`, // Show "Merge #" prefix with last 8 chars
    group.originalIds.length,
    group.orderNames
      ? group.orderNames.join(", ")
      : group.originalIds.join(", "), // Show order names if available
    group.reason === "both"
      ? "Address + Email"
      : group.reason === "email_hash"
        ? "Email"
        : "Address",
    new Date(group.createdAt).toLocaleString(),
    <InlineStack key={group.id} gap="200">
      <Button
        size="micro"
        variant="primary"
        onClick={() => setSelectedGroup(group.id)}
        loading={submitting}
      >
        Review
      </Button>
    </InlineStack>,
  ]);

  const selectedGroupData = pendingMerges.find(
    (g: any) => g.id === selectedGroup,
  );

  return (
    <Page
      title="Pending Merges"
      subtitle={`${pendingMerges.length} potential merges awaiting review`}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      {actionData && (
        <Banner
          tone={actionData.success ? "success" : "critical"}
          title={actionData.message}
          onDismiss={() => {
            // This won't work directly, but the banner will disappear on next navigation
          }}
        />
      )}
      <Card>
        {pendingMerges.length === 0 ? (
          <BlockStack gap="400">
            <Text as="p" alignment="center" tone="subdued">
              No pending merges. Orders will appear here when autoCompleteDraft
              is disabled and duplicate orders are detected.
            </Text>
          </BlockStack>
        ) : (
          <DataTable
            columnContentTypes={[
              "text",
              "numeric",
              "text",
              "text",
              "text",
              "text",
            ]}
            headings={[
              "Merge Group",
              "Order Count",
              "Original Order IDs",
              "Match Type",
              "Created",
              "Actions",
            ]}
            rows={rows}
          />
        )}
      </Card>

      {selectedGroup && selectedGroupData && (
        <Modal
          open={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          title="Review Merge"
          primaryAction={{
            content: "Approve Merge",
            onAction: () => {
              // Use the submit function directly
              const formData = new FormData();
              formData.append("action", "approve");
              formData.append("groupId", selectedGroup);
              // Submit using the submit function
              submit(formData, { method: "post" });
            },
            loading: submitting,
          }}
          secondaryActions={[
            {
              content: "Reject",
              onAction: () => {
                // Use the submit function directly
                const formData = new FormData();
                formData.append("action", "reject");
                formData.append("groupId", selectedGroup);
                // Submit using the submit function
                submit(formData, { method: "post" });
              },
              loading: submitting,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextContainer>
                <Text as="p">
                  <strong>Merge Group:</strong> #
                  {selectedGroupData.id.slice(-8)}
                </Text>
                <Text as="p">
                  <strong>Match Reason:</strong>{" "}
                  {selectedGroupData.reason === "both"
                    ? "Address + Email"
                    : selectedGroupData.reason === "email_hash"
                      ? "Email"
                      : "Address"}
                </Text>
                <Text as="p">
                  <strong>Time Window:</strong>{" "}
                  {selectedGroupData.windowMinutes} minutes
                </Text>
                <Text as="p">
                  <strong>Orders to Merge:</strong>{" "}
                  {selectedGroupData.orderNames
                    ? selectedGroupData.orderNames.join(", ")
                    : selectedGroupData.originalIds.join(", ")}
                </Text>
                <Text as="p">
                  <strong>Created:</strong>{" "}
                  {new Date(selectedGroupData.createdAt).toLocaleString()}
                </Text>
              </TextContainer>

              <Text as="p" tone="subdued">
                Approving this merge will create a draft order combining all
                items from the listed orders. The original orders will be tagged
                as "REPLACED" and "MERGED".
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
