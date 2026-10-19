This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database migrations

The checked-in `prisma/migrations` history is used for deployment with `npx prisma migrate deploy`.

For development, configure `DEV_DATABASE_URL` to point to a separate development database, then run:

```bash
npm run migrate:dev
```

This command uses a clean baseline in `prisma/dev-migrations` and does not use `DIRECT_URL` or `DATABASE_URL`. Do not point `DEV_DATABASE_URL` at a production database. If your database provider does not allow Prisma to create a shadow database, configure `SHADOW_DATABASE_URL` to a separate disposable database.

## Google sign-in

To enable Google login and registration:

1. Create a Google OAuth 2.0 **Web application** client in Google Cloud Console.
2. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI for local development. Add the matching HTTPS callback URL for each deployed environment.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the server environment. `.env.example` shows the local redirect URI format.

The Google button appears on both login and registration pages. New registrations use the Buyer or Seller role selected on the registration form; Google login for an existing email keeps its existing role. Google-authenticated sellers still need to complete the platform's seller verification process.

## Account management

Buyers, sellers, and administrators can manage their name, phone number, and profile photo from the **Manage Account** dashboard section. Password-based accounts can change their password after confirming the current password. Email changes require the current password and a one-time verification link; the login email is not updated until that link is confirmed. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL` to enable verification emails. Google-only accounts should manage their email and password in Google Account settings.

Apply the account-management database migration before deploying the feature:

```bash
npx prisma migrate deploy
```

## Auction bid and payment notifications

Every accepted bid is stored in auction history. The auction page shows the full bid history while replacing other bidders' names with anonymous labels. Each participant receives an in-app update when a new bid is accepted; email and SMS are also sent when their providers are configured. The winner receives a congratulations notice when the auction closes, then in-app deposit reminders 24 hours before and at the 72-hour payment deadline.

External delivery uses Resend for email and Twilio for SMS. Configure these server-side environment variables (see `.env.example`):

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `NEXT_PUBLIC_APP_URL` for links in email messages

Verify the sending domain/address in Resend and configure an SMS-capable Twilio number. Buyer phone numbers must use E.164 format (for example, `+251...`) for Twilio delivery. Missing provider configuration leaves in-app notifications working and is logged by the server; failed delivery responses are also logged. Keep all provider credentials private and out of source control.

Deposit reminders are processed by `/api/cron/auctions`, which is scheduled every minute in `vercel.json`. The database migration adds per-auction-result reminder markers to prevent duplicate reminders. Deploy the migration before enabling this feature in production.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
