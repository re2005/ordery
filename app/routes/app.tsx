import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import en from "@shopify/polaris/locales/en.json";
import { Frame } from "@shopify/polaris"; // Added for layout + logo

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  // Polaris Frame logo configuration. Adjust width/height as needed.
  const logo = {
    topBarSource: "/ordery-logo.png",
    contextualSaveBarSource: "/ordery-logo.png",
    url: "/app",
    accessibilityLabel: "Ordery",
    width: 140,
  };

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={en}>
      <Frame logo={logo}>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/pending">Pending Merges</Link>
          <Link to="/app/merged">Merged orders</Link>
          <Link to="/app/settings">Settings</Link>
        </NavMenu>
        <Outlet />
      </Frame>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
