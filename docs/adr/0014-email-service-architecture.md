# 14. Email Service Architecture

Date: 2026-01-31

## Status

Accepted

## Context

ktb.clubmanager requires transactional email capabilities for:
- Club invitations (post-MVP)
- Password reset emails
- Welcome emails
- Notification emails (access requests, approvals, etc.)

Key requirements:
1. **GDPR compliance** - EU data processing for German SaaS
2. **Provider flexibility** - Avoid vendor lock-in
3. **Dev/prod parity** - Same code path in development and production
4. **Cost efficiency** - Free tier sufficient for early stage

## Decision

We will use **SMTP relay** as the integration approach, not provider-specific APIs.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  NestJS Backend                                                 │
│  └── EmailService (SMTP transport)                              │
│       └── @nestjs-modules/mailer or nodemailer                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐         ┌───────────────────┐
│  Development      │         │  Production       │
│  Mailpit          │         │  SMTP Provider    │
│  localhost:1025   │         │  (configurable)   │
└───────────────────┘         └───────────────────┘
```

### Configuration

```typescript
// Environment-based SMTP configuration
transport: {
  host: process.env.SMTP_HOST,      // localhost (dev) OR provider (prod)
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,  // Mailpit needs no auth
}
```

### Provider Examples (SMTP Relay)

Any provider with SMTP relay support works. Examples for GDPR-compliant options:

| Provider | SMTP Host | Notes |
|----------|-----------|-------|
| **Brevo** | smtp-relay.brevo.com | EU company, free tier 300/day |
| **AWS SES** | email-smtp.eu-central-1.amazonaws.com | Frankfurt region |
| **Mailgun** | smtp.eu.mailgun.org | EU region available |
| **Postmark** | smtp.postmarkapp.com | Best deliverability |

### Development Setup

Mailpit runs as a Docker container, catching all outgoing emails:

```yaml
# docker-compose.yml
mailpit:
  image: axllent/mailpit
  ports:
    - "1025:1025"   # SMTP
    - "8025:8025"   # Web UI
```

### Email Templates

Templates are managed in the codebase using React Email (or similar), rendered to HTML before sending. This keeps templates version-controlled and provider-independent.

```
packages/email-templates/
├── src/
│   ├── invitation.tsx
│   ├── welcome.tsx
│   └── password-reset.tsx
└── package.json
```

## Consequences

**Positive:**

- Switch providers without code changes (env vars only)
- Same code path in dev and production
- Full control over email templates
- No SDK dependencies
- Dev emails captured locally for testing

**Negative:**

- No delivery tracking (opens, clicks, bounces) without additional setup
- Provider-specific features not accessible
- Manual rate limiting if needed

**Neutral:**

- Requires SMTP credentials management
- Deliverability depends on provider reputation

## When to Reconsider

- If delivery tracking becomes essential (switch to API + webhooks)
- If sending volume exceeds 100k/month (evaluate dedicated infrastructure)
- If provider-specific features needed (templates, scheduling)

## References

- GitHub Issue [#102](https://github.com/kbudisantoso/ktb.clubmanager/issues/102) - Email notifications
- [Nodemailer Documentation](https://nodemailer.com/)
- [React Email](https://react.email/)
