# Beta feedback (Preview candidate)

`IS_BETA` in `lib/app-version.ts` controls the prominent home card. Displayed version remains 1.0.

Server-only Vercel Preview environment variables:
- `RESEND_API_KEY`: Resend send permission API key
- `SHINROMII_FEEDBACK_FROM`: sender verified with Resend
- `SHINROMII_FEEDBACK_TO`: designated recipient

Never prefix these variables with NEXT_PUBLIC_. Redeploy Preview after configuring them. No mailto or recipient fallback is embedded in source. Missing configuration returns 503, never success.

POST /api/feedback accepts only message (1–2,000 nonblank characters), random submission UUID and ISO creation time (device UTC time). Page is fixed to `/`, the only entry point. Version comes from server source. Device/browser are reduced to categories server-side; full user-agent, IP, query, stored notebook data and cookies are not added to the mail. The browser omits credentials. Free text is user authored: the UI asks users not to include personal data; automatic personal-data removal is not claimed.

Origin/Host matching, 12KB request limit, validation, disabled send button, synchronous in-flight lock and a 10-second per-instance hashed-IP cooldown limit accidental repeat/automated requests. This in-memory cooldown is best effort across serverless instances, not a distributed spam prevention system. Resend's idempotency key prevents retries of the same submission from generating duplicate email for 24 hours. Changing the message creates a new submission. Errors retain the draft and return no provider response or recipient details. No content is logged.

`node scripts/verify-feedback.cjs` mocks the transport for success/failure and validates the allowed payload. It does not prove real email delivery. Real delivery and UI success must be checked after Preview mail credentials are configured. No Production environment/deploy is part of this work.
