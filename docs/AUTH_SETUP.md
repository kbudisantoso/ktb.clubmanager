# Authentication Setup Guide

This guide walks you through configuring OAuth providers for ktb.clubmanager.

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to [Zoho API Console](https://api-console.zoho.eu/) (EU) or [api-console.zoho.com](https://api-console.zoho.com/) (US)
- The application running locally on `http://localhost:3000`

---

## 1. Generate Auth Secret

Auth.js requires a secret for signing tokens. Generate one:

```bash
npx auth secret
```

This outputs a value like `AUTH_SECRET=abc123...`. Save it for later.

Alternatively, generate manually:

```bash
openssl rand -base64 32
```

---

## 2. Google OAuth Setup

### 2.1 Create Project (if needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name: `ktb-clubmanager` (or your preference)
4. Click **Create**

### 2.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** (allows any Google account)
3. Click **Create**

Fill in the form:

| Field              | Value                    |
| ------------------ | ------------------------ |
| App name           | `ktb.clubmanager`        |
| User support email | Your email               |
| App logo           | Optional (can add later) |
| App domain         | Leave blank for now      |
| Developer contact  | Your email               |

4. Click **Save and Continue**

**Scopes:**

5. Click **Add or Remove Scopes**
6. Select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
7. Click **Update** → **Save and Continue**

**Test Users (while in testing mode):**

8. Click **Add Users**
9. Add email addresses of people who should be able to sign in during development
10. Click **Save and Continue** → **Back to Dashboard**

### 2.3 Create OAuth Client ID

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `ktb.clubmanager-web`

**Authorized redirect URIs:**

Add these URIs (click **Add URI** for each):

```
http://localhost:3000/api/auth/callback/google
```

For production, also add:

```
https://yourdomain.com/api/auth/callback/google
```

5. Click **Create**

### 2.4 Copy Credentials

A dialog shows your credentials:

- **Client ID** → This is your `AUTH_GOOGLE_ID`
- **Client Secret** → This is your `AUTH_GOOGLE_SECRET`

Save these securely.

### 2.5 Publishing Status

While in **Testing** mode:

- Only users you added as test users can sign in
- Maximum 100 test users

To allow **any Google account**:

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Confirm the prompt

> **Note:** For basic scopes (email, profile), Google usually approves automatically. Sensitive scopes require verification.

---

## 3. Zoho OAuth Setup

### 3.1 Choose Your Datacenter

Zoho has regional datacenters. Use the one matching your users:

| Region    | API Console                                                 | Issuer URL                     |
| --------- | ----------------------------------------------------------- | ------------------------------ |
| EU        | [api-console.zoho.eu](https://api-console.zoho.eu/)         | `https://accounts.zoho.eu`     |
| US        | [api-console.zoho.com](https://api-console.zoho.com/)       | `https://accounts.zoho.com`    |
| India     | [api-console.zoho.in](https://api-console.zoho.in/)         | `https://accounts.zoho.in`     |
| Australia | [api-console.zoho.com.au](https://api-console.zoho.com.au/) | `https://accounts.zoho.com.au` |

> **Important:** Users with Zoho accounts in different datacenters need separate provider configurations. For MVP, we use EU datacenter.

### 3.2 Create Application

1. Go to your region's API Console (e.g., [api-console.zoho.eu](https://api-console.zoho.eu/))
2. Click **Add Client**
3. Select **Server-based Applications**

Fill in the form:

| Field                    | Value                                          |
| ------------------------ | ---------------------------------------------- |
| Client Name              | `ktb.clubmanager`                              |
| Homepage URL             | `http://localhost:3000`                        |
| Authorized Redirect URIs | `http://localhost:3000/api/auth/callback/zoho` |

4. Click **Create**

### 3.3 Copy Credentials

After creation, you'll see:

- **Client ID** → This is your `AUTH_ZOHO_ID`
- **Client Secret** → This is your `AUTH_ZOHO_SECRET`

Save these securely.

### 3.4 Note the Issuer

Based on the datacenter you used:

```
AUTH_ZOHO_ISSUER=https://accounts.zoho.eu
```

---

## 4. Environment Configuration

Create or update `.env.local` in the `apps/web` directory:

```bash
# apps/web/.env.local

# Auth.js Secret (required)
AUTH_SECRET=your-generated-secret-here

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# Zoho OAuth
AUTH_ZOHO_ID=1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXX
AUTH_ZOHO_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_ZOHO_ISSUER=https://accounts.zoho.eu

# Database (from docker-compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clubmanager
```

For the NestJS API, create `apps/api/.env.local`:

```bash
# apps/api/.env.local

# JWT Secret (should match or be derived from AUTH_SECRET)
JWT_SECRET=your-jwt-secret-here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clubmanager
```

---

## 5. Verification Checklist

Before running the application, verify:

- [ ] `AUTH_SECRET` is set (32+ characters)
- [ ] `AUTH_GOOGLE_ID` ends with `.apps.googleusercontent.com`
- [ ] `AUTH_GOOGLE_SECRET` is set
- [ ] Google redirect URI includes `http://localhost:3000/api/auth/callback/google`
- [ ] Your Google account is added as a test user (or app is published)
- [ ] `AUTH_ZOHO_ID` starts with `1000.`
- [ ] `AUTH_ZOHO_SECRET` is set
- [ ] `AUTH_ZOHO_ISSUER` matches your datacenter
- [ ] Zoho redirect URI includes `http://localhost:3000/api/auth/callback/zoho`
- [ ] `JWT_SECRET` is set for the API
- [ ] Database is running (`docker compose up -d postgres`)

---

## 6. Testing Authentication

Start the application:

```bash
pnpm dev
```

1. Navigate to `http://localhost:3000/login`
2. Click **Mit Google anmelden**
3. Complete Google sign-in flow
4. Verify redirect to `/dashboard`
5. Check that user avatar appears in header
6. Repeat with **Mit Zoho anmelden**

### Troubleshooting

**"Access blocked: This app's request is invalid"**

- Check redirect URI matches exactly (no trailing slash)
- Verify you're using the correct Client ID

**"Error 401: deleted_client"**

- The OAuth client was deleted; create a new one

**"You can't sign in because [app] didn't complete the Google verification process"**

- Your Google account is not in the test users list
- Either add yourself as a test user or publish the app

**Zoho: "Invalid client"**

- Verify Client ID and Secret are correct
- Check you're using the right datacenter's issuer URL

**Session not persisting**

- Ensure `AUTH_SECRET` is set
- Check cookies are not blocked by browser
- Verify database is running and migrations applied

---

## 7. Production Configuration

For production deployment, update:

1. **Redirect URIs** in both Google and Zoho consoles to include your production domain
2. **Environment variables** on your hosting platform
3. **AUTH_TRUST_HOST** may need to be set to `true` behind reverse proxies

Example production `.env`:

```bash
AUTH_SECRET=production-secret-here
AUTH_TRUST_HOST=true

AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

AUTH_ZOHO_ID=...
AUTH_ZOHO_SECRET=...
AUTH_ZOHO_ISSUER=https://accounts.zoho.eu

DATABASE_URL=postgresql://user:pass@production-db:5432/clubmanager
```

---

## Quick Reference

| Variable             | Source               | Example                                |
| -------------------- | -------------------- | -------------------------------------- |
| `AUTH_SECRET`        | `npx auth secret`    | `abc123def456...`                      |
| `AUTH_GOOGLE_ID`     | Google Cloud Console | `123456789.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console | `GOCSPX-...`                           |
| `AUTH_ZOHO_ID`       | Zoho API Console     | `1000.ABC123...`                       |
| `AUTH_ZOHO_SECRET`   | Zoho API Console     | `abc123def456...`                      |
| `AUTH_ZOHO_ISSUER`   | Based on datacenter  | `https://accounts.zoho.eu`             |
| `JWT_SECRET`         | Generate or derive   | `your-secret-here`                     |

---

_Last updated: 2026-01-26_
