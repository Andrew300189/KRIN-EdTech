# Email confirmation setup

KRIN EdTech sends verification links through the existing Resend provider. Add
the following server-only variables in the deployment environment (and to
`.env.local` for a real local test):

```env
NEXTAUTH_URL="https://krin.com"
EMAIL_PROVIDER="resend"
EMAIL_API_KEY="re_your_resend_api_key"
EMAIL_FROM_DEFAULT="KRIN EdTech <noreply@krin.com>"
EMAIL_FROM_SECURITY="KRIN EdTech Security <security@krin.com>"
```

Before enabling it, verify `krin.com` in the Resend dashboard.
Do not place `EMAIL_API_KEY` in source control or any `NEXT_PUBLIC_*`
variable. In production, registration intentionally refuses to create a new
account unless this delivery configuration is present.

The verification flow creates a 32-byte random token, stores only its SHA-256
hash, limits each token to 24 hours, replaces older links on resend, and
consumes it atomically after an explicit user confirmation. Resend requests are
rate-limited per requester and per account; their response does not reveal
whether an address has an account.
