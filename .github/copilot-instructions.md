# Ordery: Shopify Order Merge App Development Guide

Ordery is a Shopify app built on Remix that automatically detects and merges duplicate orders from the same customer within a configurable time window. It uses Prisma with PostgreSQL for data persistence and the Shopify GraphQL Admin API for order operations.

## Core Architecture

### Order Detection & Merging Pipeline

The app follows a multi-stage pipeline:

1. **Webhook triggers** (`/webhooks`) receive order events from Shopify
2. **Detector service** (`app/services/detector.server.ts`) analyzes new orders for duplicates using hashed address/email matching
3. **Merge service** (`app/services/merge.server.ts`) creates draft orders combining duplicate items
4. **Order completion** via Shopify Admin API converts drafts to final orders

### Database Models (Prisma)

- `OrderIndex`: Tracks all orders with hashed identifiers for matching (`addressHash`, `emailHash`)
- `MergeGroup`: Represents a set of orders identified for merging with status tracking
- `ShopSettings`: Per-shop configuration for matching rules and timing windows
- `Session`: Standard Shopify app session storage

### Route Structure

- `app._index.tsx`: Dashboard with merge statistics
- `app.merged.tsx`: List view of completed merge operations
- `app.settings.tsx`: Configuration UI for merge rules
- `webhooks/`: Handle Shopify webhook events for orders and app lifecycle

## Development Patterns

### Shopify Authentication

Always use the `authenticate.admin(request)` pattern from `app/shopify.server.ts`:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await shopify.authenticate.admin(request);
  // Use session.shop for multi-tenant data queries
}
```

### Data Access Pattern

Models in `app/models/` follow a consistent pattern:

- Import `prisma` from `../db.server`
- Use `shop` field for multi-tenant isolation
- Implement upsert patterns for idempotent operations

### Hashing for Privacy

Customer data is hashed using shop-specific salts (see `app/lib/hash.server.ts`):

- Addresses and emails are never stored in plaintext
- Hash comparison enables duplicate detection without exposing PII

### GraphQL API Usage

Use the admin object for Shopify API calls:

```typescript
const response = await admin.graphql(
  `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) { ... }
  }
`,
  { variables: { input: draftOrder } },
);
```

## Configuration & Deployment

### Environment Variables

- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`: App credentials
- `SHOPIFY_APP_URL`: Public app URL for OAuth callbacks
- `DATABASE_URL`: PostgreSQL connection string
- `SCOPES`: Comma-separated Shopify permissions (defined in `shopify.app.toml`)

### Build Commands

- `npm run dev`: Start development with Shopify CLI tunnel
- `npm run build`: Remix production build
- `npm run setup`: Run Prisma migrations and generate client
- `npm run deploy`: Deploy app configuration to Shopify

### Webhooks Configuration

Webhooks are defined in `shopify.app.toml` and routed to:

- `/webhooks` for order events (create/update)
- `/webhooks/app/uninstalled` for app cleanup
- `/webhooks/app/scopes_update` for permission changes

### Database Migrations

Use Prisma CLI for schema changes:

```bash
npx prisma migrate dev --name description
npx prisma generate  # Update client after schema changes
```

## Key Dependencies

- `@shopify/shopify-app-remix`: Core Shopify app framework with authentication
- `@shopify/polaris`: UI components following Shopify design system
- `@shopify/app-bridge-react`: Embedded app navigation and actions
- `@vercel/remix`: Deployment optimizations for Vercel hosting
- `@prisma/client`: Type-safe database client

## Performance Considerations

- Order index queries use compound indexes on `(shop, addressHash, createdAt)`
- Time window filtering limits database scans for duplicate detection
- Background job processing for merge operations prevents webhook timeouts
- Prisma connection pooling for concurrent request handling

## Testing Shopify Integration

Use Shopify CLI for webhook testing:

```bash
shopify app dev  # Starts tunnel and development environment
shopify app generate webhook  # Create new webhook handlers
```

For order testing, create test orders in your development store or use the CLI webhook trigger feature.
