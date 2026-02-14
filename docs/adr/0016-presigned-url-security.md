# ADR-0016: Presigned URL Security — 302 Redirects and Purpose-Aware Expiry

## Status

Accepted

## Date

2026-02-14

## Context

The file upload system uses S3-compatible presigned URLs (via MinIO) for both uploads and downloads. The initial implementation used a default expiry of 3600 seconds (1 hour) for all presigned URLs — the minio-js SDK default.

### Problems

1. **Long-lived download URLs**: A 1-hour presigned GET URL can be shared, bookmarked, or leaked. Anyone with the URL can access the file without authentication.
2. **Frontend URL management**: The client fetches a presigned GET URL via API, then sets it as an `<img src>`. This URL is visible in DOM, network tab, and can be extracted.
3. **No purpose differentiation**: A club logo (small, fetched frequently) had the same expiry as a future 100 MB document upload.

### Industry Research

| Platform                  | Recommended Expiry                               | Notes                                           |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| AWS Prescriptive Guidance | **15 min** guardrail via `s3:signatureAge`       | Official IAM policy recommendation              |
| AWS Prescriptive Guidance | **60s** practical minimum                        | Below this, clock drift causes false rejections |
| Supabase Storage          | **2 hours** (upload, hardcoded)                  | Downloads: user-specified, no default           |
| Cloudflare R2             | **1–4 hours** in examples                        | Docs: "use short expiration for sensitive ops"  |
| Google Cloud Storage      | **15 min** common default                        | Max 7 days                                      |
| Firebase Storage          | Token-based (never expires) or **15 min** signed | Two separate mechanisms                         |

### Key Insight

S3 validates the presigned signature at **request start**, not during transfer. A file that takes 30 seconds to download only needs the URL to be valid at the moment the GET request begins. This means expiry can be much tighter than the transfer time.

## Decision

### 1. Purpose-Aware Expiry Constants

Define expiry durations per file purpose, separately for upload and download, in a central constants file (`apps/api/src/files/file-defaults.ts`).

**Upload expiry**: Time between presigned URL generation and the PUT request. In our flow, the URL is generated immediately before upload (post-crop), so dead time is ~200ms.

**Download expiry (redirect)**: Time between 302 redirect and the browser following the Location header. Effectively instant, but needs margin for slow clients and network latency.

| Purpose            | Upload Expiry | Download Expiry | Rationale                                                 |
| ------------------ | ------------- | --------------- | --------------------------------------------------------- |
| `club-logo`        | 10s           | 60s             | Small file (<5 MB), URL used immediately after generation |
| `user-avatar`      | 10s           | 60s             | Same profile as club-logo                                 |
| Default / fallback | 120s          | 60s             | Future large file uploads may need more headroom          |

### 2. 302 Redirect Pattern for File Serving

Instead of the frontend fetching a presigned URL via API and setting it in the DOM:

**Before (current):**

```
Browser → GET /api/clubs/:slug/files/:id → { url: "https://s3...?signature=..." }
Browser → GET https://s3...?signature=...
```

The presigned URL is exposed in JS memory, DOM, and network tab. Must be long-lived because the user might not load the image immediately.

**After (redirect):**

```
Browser → GET /api/clubs/:slug/files/logo → 302 Location: https://s3...?signature=...
Browser → GET https://s3...?signature=... (automatic follow)
```

The stable, auth-protected URL (`/files/logo`) can be used directly in `<img src>`. The short-lived presigned URL is only visible in the network tab's redirect chain. This is the pattern used by GitHub, GitLab, and Slack for file serving.

**Requirements:**

- The redirect endpoint is protected by session auth (cookie-based), so `<img src>` works without JS intervention
- `Cache-Control: private, no-store` prevents caching the 302 response
- The presigned URL in the Location header has a short expiry (60s)

### 3. Values Rationale

**Upload 10s**: 50x headroom over the ~200ms dead time. Well above AWS's 2-second minimum for clock safety. Short enough that a leaked upload URL is near-useless.

**Download 60s**: At AWS's stated practical minimum for `s3:signatureAge`. In the redirect flow, the browser follows the 302 within milliseconds — 60s provides generous margin for slow mobile connections, retries, and edge cases. Well below the 15-minute industry guardrail.

**Default 120s**: For future purposes (large document uploads) where the upload itself may take longer. Still 30x shorter than the previous 1-hour default.

## Consequences

### Positive

- **Reduced attack window**: Leaked presigned URLs expire in seconds/minutes, not hours
- **Purpose-aware**: Each file type gets appropriate security margins
- **Stable URLs**: `<img src="/api/clubs/:slug/files/logo">` survives page reloads without JS re-fetching
- **Centralized**: All expiry values in one file, easy to audit and adjust
- **Industry-aligned**: Follows AWS prescriptive guidance (60s minimum, 15-min guardrail)

### Negative

- **Extra redirect hop**: One additional HTTP round-trip for downloads (302 → GET). Negligible for modern browsers
- **No browser caching of S3 response**: Since each redirect generates a new presigned URL, the browser can't HTTP-cache the S3 response. For logos, the redirect endpoint can add `Cache-Control` headers to cache the 302 itself if needed in the future
- **Tight upload window**: If network is very slow or user's clock is significantly skewed, 10s upload expiry could fail. Mitigated by the flow design (URL generated immediately before upload)

### Neutral

- S3Service methods retain their `expirySeconds` parameter for flexibility
- Existing tests continue to use default parameters (no behavioral change)

## References

- [AWS Prescriptive Guidance: Presigned URL Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/overview.html)
- [AWS: Additional Guardrails for Presigned URLs](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/additional-guardrails.html)
- [Cloudflare R2: Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [ADR-0004: MinIO Object Storage](./0004-minio-object-storage.md)
