import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import shopify from "../shopify.server";

import {
  Page,
  Card,
  TextField,
  Checkbox,
  Button,
  BlockStack,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "app/models/settings.server";

/* ------------------------------- GQL -------------------------------- */

// default settings if none exist
const DEFAULT_SETTINGS = {
  windowMinutes: 120,
  byAddress: true,
  byEmail: false,
  requireBoth: false,
  autoCompleteDraft: true,
} as const;

/* ------------------------------ LOADER ------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const settings = await getSettings(session.shop);
  return { shop: session.shop, settings };
}

/* ------------------------------ ACTION ------------------------------ */

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await shopify.authenticate.admin(request);
  const form = await request.formData();

  // sanitize
  const windowMinutes = Math.max(
    5,
    Math.min(
      1440,
      Number(form.get("windowMinutes") || DEFAULT_SETTINGS.windowMinutes),
    ),
  );
  const byAddress = form.get("byAddress") === "on";
  const byEmail = form.get("byEmail") === "on";
  const requireBoth = form.get("requireBoth") === "on";
  const autoCompleteDraft = form.get("autoCompleteDraft") === "on";

  const valueObj = {
    windowMinutes,
    byAddress,
    byEmail,
    requireBoth,
    autoCompleteDraft,
  };

  // Save to database instead of metafields
  try {
    await updateSettings(session.shop, valueObj);
    console.log("Settings saved successfully");
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Response("Failed to save settings", { status: 500 });
  }
}

/* ------------------------------- VIEW ------------------------------- */

export default function SettingsPage() {
  const { shop, settings } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";

  const [windowMinutes, setWindowMinutes] = useState(
    String(settings.windowMinutes),
  );
  const [byAddress, setByAddress] = useState(settings.byAddress);
  const [byEmail, setByEmail] = useState(settings.byEmail);
  const [requireBoth, setRequireBoth] = useState(settings.requireBoth);
  const [autoCompleteDraft, setAutoCompleteDraft] = useState(
    settings.autoCompleteDraft,
  );

  useEffect(() => {
    setWindowMinutes(String(settings.windowMinutes));
    setByAddress(settings.byAddress);
    setByEmail(settings.byEmail);
    setRequireBoth(settings.requireBoth);
    setAutoCompleteDraft(settings.autoCompleteDraft);
  }, [settings]);

  return (
    <Page title="Settings">
      <Card>
        <BlockStack gap="400">
          <Text as="p" tone="subdued">
            Define how orders are matched and merged. Time window can be 5–1440
            minutes.
          </Text>

          <Form method="post">
            <input type="hidden" name="shop" value={shop} />

            {/* Hidden inputs to ensure checkbox values are submitted */}
            <input
              type="hidden"
              name="byAddress"
              value={byAddress ? "on" : "off"}
            />
            <input
              type="hidden"
              name="byEmail"
              value={byEmail ? "on" : "off"}
            />
            <input
              type="hidden"
              name="requireBoth"
              value={requireBoth ? "on" : "off"}
            />
            <input
              type="hidden"
              name="autoCompleteDraft"
              value={autoCompleteDraft ? "on" : "off"}
            />

            <BlockStack gap="400">
              <TextField
                label="Window (minutes)"
                type="number"
                name="windowMinutes"
                value={windowMinutes}
                onChange={(val) => setWindowMinutes(val)}
                autoComplete="off"
                min={5}
                max={1440}
                helpText="Orders to the same address within this window are candidates for merge."
              />

              <Card>
                <BlockStack gap="300">
                  <Checkbox
                    label="Match by shipping address"
                    checked={byAddress}
                    onChange={setByAddress}
                  />
                  <Checkbox
                    label="Also match by customer email"
                    checked={byEmail}
                    onChange={setByEmail}
                  />
                  <Checkbox
                    label="Require BOTH address and email to match"
                    checked={requireBoth}
                    onChange={setRequireBoth}
                    helpText="If unchecked, either address or email match will qualify."
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Checkbox
                    label="Automatically complete merged draft (mark paid)"
                    checked={autoCompleteDraft}
                    onChange={setAutoCompleteDraft}
                    helpText="If off, the app will create a Draft Order and wait for your review."
                  />
                </BlockStack>
              </Card>

              <InlineStack align="end" gap="300">
                <Button submit variant="primary" loading={submitting}>
                  Save settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </BlockStack>
      </Card>
    </Page>
  );
}
