# EHRS Auction Platform

EHRS is a multi-tenant web marketplace for publishing property and other asset listings, running scheduled auctions, collecting payment evidence, and managing the auction lifecycle. The interface and defaults are tailored to the Ethiopian market: the default currency is ETB and the default time zone is `Africa/Addis_Ababa`.

The application is built with the Next.js App Router. Server-rendered pages and server actions use Prisma to read and update a PostgreSQL database; the interactive dashboards and auction views are React client components.

## Contents

- [Capabilities](#capabilities)
- [Auction and payment workflows](#auction-and-payment-workflows)
- [Technology and architecture](#technology-and-architecture)
- [Routes](#routes)
- [Data model](#data-model)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database and bootstrap](#database-and-bootstrap)
- [Integrations and scheduled work](#integrations-and-scheduled-work)
- [Uploads and deployment](#uploads-and-deployment)
- [Quality checks](#quality-checks)

## Capabilities

### Public marketplace

- Browse approved listings and scheduled or active auctions.
- View listing location, category, attributes, photos, description, seller verification status, auction terms, and bid history.
- View other bidders using anonymous labels; a buyer sees their own bids as “You.”
- See auction results when the listing is available for public display.

### Buyers

- Register as a buyer, sign in with a password or Google, and manage profile details.
- Browse auctions, maintain a watchlist, and view bids, payment records, notifications, and support tickets from the buyer dashboard.
- Submit auction entrance-fee payment details and proof. Depending on the payment path, access is enabled after payment confirmation or administrator review.
- Place bids on eligible live auctions. Forward auctions require increasing bids; reverse auctions accept decreasing bids. The server checks auction status, buyer eligibility, seller ownership, bid increment, and existing pending bids.
- View live reverse-auction bid amounts and participating company names after receiving approval to participate.
- Contact a seller about an auction and submit support, complaint, or dispute tickets.
- Pay the post-auction deposit and track settlement status when they win an auction.

### Sellers

- Submit seller identity and business details for KYC review.
- Create listings with category-specific attributes, photos, identity and ownership documents, and optional video links.
- Complete the listing readiness checks, including at least two images and a recent WebAuthn biometric verification, before submitting an auction for review.
- Configure auction dates, starting and reserve prices, minimum bid increments, and terms.
- Submit and track listing and auction review, entry-fee payment, bids, buyer inquiries, and notifications from the seller dashboard.

### Administrators

- Review seller verification, listings, auction submissions, and payment evidence.
- Manage users, user status, categories, auctions, payment records, support tickets, and system settings.
- Review audit history, view marketplace activity, and manage tenant branding.
- Confirm, reject, or waive eligible buyer auction registrations.

### Account, organization, and support features

- Password-based accounts can update profile information and change their password after confirming the current password.
- Account email changes require the current password and a one-time verification link. Google-only accounts manage their email and password with Google.
- WebAuthn is used for seller biometric verification associated with listing submission.
- The application has tenant records, tenant-specific branding, and tenant-aware listing and auction access.
- In-app notifications are stored in the database. Email and SMS notifications are sent when their providers are configured.

## Auction and payment workflows

### Seller listing to auction

1. A seller creates a private listing draft with its category, location, descriptive fields, images, and required identity/ownership materials.
2. The seller completes the readiness checklist and verifies using a supported authenticator. The verification is time-limited and consumed when the listing is created.
3. The seller configures the auction and submits it for review. Auction submission can include an auction entry-fee payment step.
4. An administrator reviews the seller/listing/auction information and approves or rejects the submission.
5. Approved scheduled auctions become active when their start time is reached.

### Buyer registration and bidding

1. A buyer opens an eligible auction and registers by paying or submitting the required entrance-fee evidence.
2. Payment proof that requires review must be approved by an administrator before the buyer can bid. Some Chapa and confirmed-fee paths can verify payment server-to-server.
3. The buyer places bids while the auction is active. Forward bids must meet the starting price or exceed the current high by the configured increment. Reverse bids must not exceed the opening price and must undercut the current low by that increment.
4. Accepted bids are recorded in auction history. Participants, the seller, and administrators receive in-app notifications; configured email and SMS providers can also send updates.
5. A valid accepted bid in the final five minutes adds five minutes to the existing deadline, up to ten times. Each extension is recorded, and bids after the final deadline are rejected.
6. Authorized reverse-auction participants can see live approved bid amounts and company names without refreshing the page. Other viewers continue to see the anonymized public bid history.

### Auction close and settlement

- The lifecycle worker activates scheduled auctions and closes expired active auctions.
- At close, the highest eligible approved bid wins a forward auction; the lowest eligible approved bid wins a reverse auction. The result records whether the reserve price was met and waits for administrator review.
- An administrator rechecks the proposed winner's eligibility before approval. An approved winner receives a deposit obligation and a 72-hour settlement deadline, which begins at approval. The default deposit percentage is initialized from system settings and is administrator-configurable.
- The application sends in-app reminders 24 hours before the deadline and when the deadline is reached. Email/SMS delivery depends on provider configuration.
- Payment records, receipts, and administrator verification support settlement tracking.

### Payment methods

The application includes Chapa integration and workflows for submitting bank-transfer or other payment references and evidence. The available options depend on the specific payment flow:

- Auction entry fees: Chapa and bank-transfer proof flows are implemented.
- Buyer registration: Chapa, Telebirr, or bank-transfer evidence can be submitted; approval may require an administrator.
- Bid-related payments and post-auction payments have payment records and review flows in the dashboards.

Do not treat a browser redirect or buyer-provided reference alone as proof of a Chapa payment. Chapa transactions are verified by the server against Chapa’s verification API.

## Technology and architecture

- **Application:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL
- **ORM / generated client:** Prisma 7
- **Database runtime adapter:** Prisma Neon adapter
- **Validation:** Zod
- **Authentication:** application-managed sessions, bcrypt password hashes, Google OAuth, and WebAuthn
- **Notifications:** in-app records, Resend email, and Twilio SMS
- **Media:** private local filesystem storage served through authenticated application routes

Most domain operations live in `app/actions/` as server actions and `lib/` as shared services. API route handlers under `app/api/` cover authentication, uploads/media, branding, payment callbacks, biometrics, and scheduled auction processing. Prisma schema and migration history are in `prisma/`.

Authentication uses an HTTP-only `auction_session` cookie. Session token hashes and expiration are stored in the database. Authorization is checked on the server using role and permission helpers; client-side visibility is not the security boundary.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public marketplace home |
| `/about` | Platform information |
| `/auction/[id]` | Public auction and listing details |
| `/login`, `/register` | Account access and registration |
| `/buyer`, `/customer` | Buyer dashboard (both paths render the buyer dashboard) |
| `/seller`, `/provider` | Seller dashboard (both paths render the seller dashboard) |
| `/admin` | Administrator dashboard |
| `/payment/entry-fee`, `/payment/bid` | Payment flows |
| `/account/verify-email` | Confirm an account email change |

Important API routes include:

- `/api/auth/*` — registration, login, logout, current user, and Google OAuth
- `/api/biometric/*` — WebAuthn challenge and verification
- `/api/upload/[kind]`, `/api/media/[id]` — upload and retrieve media
- `/api/payments/chapa/webhook` — Chapa callback and server-side transaction verification
- `/api/cron/auctions` — scheduled auction lifecycle and cleanup work
- `/api/branding/*` — tenant branding

## Data model

The Prisma schema is the authoritative model. Its main groups are:

- **Identity and authorization:** users, roles, sessions, verification tokens, buyer/seller profiles
- **Marketplace:** tenants, categories, listings, listing images, listing documents, tenant branding
- **Auctions:** auctions, bids, buyer registrations, buyer and seller entry fees, watchlists, results, payments
- **Trust and support:** biometric credentials/verifications, support tickets and messages
- **Operations:** notifications, audit logs, system settings, media metadata, and payment webhook event records

Most payments use ETB by default. Auction and payment states are persisted as enums; auction transitions and bid eligibility are enforced by server-side domain logic.

## Local development

### Prerequisites

- Node.js 20.9 or later
- npm
- A PostgreSQL database reachable from the application and Prisma CLI

### Install and run

```bash
npm ci
```

Create a local `.env` file and configure the required database URLs from [Environment variables](#environment-variables). Then generate the Prisma client and apply the development migration:

```bash
npx prisma generate
npm run migrate:dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run migrate:dev` runs `prisma migrate dev --config prisma.config.ts`. The Prisma config reads `DIRECT_URL` and points to `prisma/migrations`; use a disposable development database for this command. The running application connects using `DATABASE_URL`.

## Environment variables

Set secrets in the server environment or in an untracked local `.env` file. Do not commit credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes, for app runtime | PostgreSQL connection used by the Prisma Neon adapter |
| `DIRECT_URL` | Yes, for Prisma CLI/migrations | PostgreSQL connection read by `prisma.config.ts` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | OAuth callback URL, e.g. `http://localhost:3000/api/auth/google/callback` |
| `CHAPA_SECRET_KEY` | Optional | Chapa server API credential |
| `APP_URL` | Required for Chapa | Public base URL used for Chapa callback and return URLs |
| `RESEND_API_KEY` | Optional | Resend API key for email |
| `RESEND_FROM_EMAIL` | Optional | Verified sender address for Resend |
| `NEXT_PUBLIC_APP_URL` | Optional | Application URL used to construct email links |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio server credential |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio SMS-capable sending number |
| `CRON_SECRET` | Required to use scheduled endpoint | Shared secret checked by `/api/cron/auctions` |
| `UPLOAD_DIR` | Optional | Persistent upload directory; defaults to `storage/uploads` |
| `WEBAUTHN_RP_ID` | Optional | WebAuthn relying-party ID; defaults to `localhost` |
| `WEBAUTHN_RP_NAME` | Optional | WebAuthn display name |
| `TENANT_ROOT_DOMAIN` | Optional | Root domain used when resolving tenant branding |

The repository's `.env.example` contains OAuth and notification examples; it does not currently list every variable in this table. Add the database and any optional integration settings needed by your environment.

### Google OAuth

1. Create a Google OAuth 2.0 Web application client.
2. Add the local callback `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI.
3. Set the three `GOOGLE_*` variables. For deployment, register the matching HTTPS callback URI and set the deployed values.
4. Configure Google consent and authorized origins in Google Cloud Console.

New Google registrations use the role selected on the registration form. An existing account keeps its existing role when signing in with Google.

## Database and bootstrap

Prisma uses the PostgreSQL schema in `prisma/schema.prisma`. The checked-in deployment migration history is `prisma/migrations`.

For production, set `DIRECT_URL` to the intended deployment database and apply committed migrations before serving the updated application:

```bash
npx prisma migrate deploy
```

For development, use a separate non-production database with `npm run migrate:dev`. Do not point a migration command at a production database unless that is the intentional deployment procedure.

The authentication flows call an idempotent bootstrap that initializes roles, the default tenant and branding, categories, system settings, and sample accounts. Before exposing a production environment, review `lib/seed.ts` and remove or replace development/bootstrap accounts and defaults according to your operational policy.

## Integrations and scheduled work

### Chapa

Chapa is enabled when `CHAPA_SECRET_KEY` and `APP_URL` are configured. Configure the Chapa account and callback/return URLs for the deployed environment. The callback endpoint performs a server-to-server payment verification before confirming eligible transactions.

### Email and SMS

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for email, and verify the sender/domain with Resend. Set all three `TWILIO_*` variables and use a Twilio SMS-capable number for SMS delivery. Phone numbers should be in E.164 format for delivery. If a provider is not configured, in-app notifications continue to be recorded; provider delivery requires its credentials and may fail independently.

Account email-change verification also uses Resend in production. In development, when Resend is not configured, the verification URL is written to the server log.

### Auction cron

`vercel.json` schedules `/api/cron/auctions` every minute. The endpoint checks the request's `Authorization` header against `CRON_SECRET`. Configure the scheduler to send the configured secret; do not expose this endpoint without it. The handler synchronizes auction states, creates results for closed auctions, sends settlement reminders, and purges orphaned media files.

## Uploads and deployment

Uploaded file bytes are stored on local disk, by default in `storage/uploads`; metadata is stored in PostgreSQL. `UPLOAD_DIR` can override the directory. Media routes enforce authentication/ownership rules and validate uploaded content by inspecting file signatures.

Supported upload classes include JPEG, PNG, and WebP images, and PDF identity, ownership, or payment documents. Profile images have a 5 MB limit; listing images, identity documents, and proof uploads have 10 MB limits; ownership documents have a 15 MB limit.

Production hosting must provide a persistent, durable volume for uploads or the storage implementation must be replaced with object storage. Ephemeral serverless filesystems can lose uploads between invocations or deployments. Back up the database and uploaded files together.

Deployments also need:

- PostgreSQL connectivity for both runtime (`DATABASE_URL`) and migrations (`DIRECT_URL`)
- `npx prisma migrate deploy` as part of the controlled release process
- Correct OAuth, payment, notification, and cron configuration for the deployed domain
- Persistent upload storage
- HTTPS for production authentication, callbacks, and WebAuthn use

The Next.js configuration enables WebP/AVIF image optimization and sets `X-Frame-Options: SAMEORIGIN`.

## Quality checks

Available npm scripts:

```bash
npm run lint
npm run build
```

There is no `npm test` script in `package.json`. The repository includes standalone QA and seed scripts under `scripts/`; inspect their source and configure an isolated test database before running database-writing scripts.
