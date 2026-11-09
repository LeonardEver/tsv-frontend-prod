# Safe local mock testing

The local mock account was set to **Operator** through the guarded backend service. Its role was not elevated, no production database was used, and no payment or Stripe request was made. An existing Stripe Customer without a subscription was preserved unchanged; accounts with a provider subscription, provider reference or Stripe subscription/price cannot use the local plan switch.

## Local behavior

- Backend `NODE_ENV=development` refuses to construct/use the Stripe SDK, even if development credentials remain configured. Checkout returns `503 BILLING_NOT_CONFIGURED` before a provider request.
- The Vite development UI does not mount Stripe checkout. The Stripe module uses its `pure` entry point, preventing script auto-injection merely by importing the billing screen. Production builds retain the configured Stripe checkout path.
- The Vite development server accepts only actual loopback API/proxy URLs. `localhost.example.com`, a remote production origin and a URL with credentials disguised as a hostname are rejected. Production builds are unaffected by this local proxy rule.
- Local plan switching requires a loopback PostgreSQL development database named `survival_academy_dev`, mock OIDC enabled, and loopback app URLs. Disposable automated test databases have an explicit project-specific `_test` allowlist. Staging and production never register this route or the mock OIDC provider.
- The HTTP switch additionally checks the real socket peer. `X-Forwarded-For` and other proxy headers cannot authorize it.
- In development the backend matches the complete stored mock OIDC identity: provider, expected local issuer, signed-claim subject, composite identity key, verified email and known mock email pattern. A display name or an email entered by a normal user is insufficient. The client cannot choose another account to upgrade.
- The subscription change is transactional and uses existing entitlement rules. No role, progress, XP, quota rule or authentication check is overridden.

## Repeatable local setup

Run from `backend` while its configuration points to the intended local database:

```powershell
# Inspect only; chooses the most recently used verified mock identity
pnpm exec tsx scripts/local-mock-plan.ts --plan operator

# Explicitly apply to that local mock
pnpm exec tsx scripts/local-mock-plan.ts --plan operator --write

# Optional: choose a particular verified local mock or test another tier
pnpm exec tsx scripts/local-mock-plan.ts --user-id 64 --plan survivor --write
```

The tool fails closed outside the local mock runtime. It refuses ordinary accounts and accounts with provider subscriptions. It never deletes Stripe links or fabricates a paid invoice. The current mock was upgraded in place, preserving its progress. The existing mock provider creates a different identity on a fresh sign-in; after signing in again, use this command or the local Plans screen to select the desired mock plan. New real registrations and production users retain the normal Free/default billing behavior.

The local Plans screen explains that payments are disabled. A backend rejection remains a rejection and is displayed; the browser does not retry through Stripe or invent a successful upgrade.

## PDFs require a paid plan

At the user's explicit request, the previous Free inline-preview rule has been replaced. Opening **and** downloading generated field resources now require `resource_download` from the server's current Survivor/Operator entitlement context. A Free user cannot obtain the same bytes by changing `disposition=attachment` to `disposition=inline`. The check happens before filesystem access or signed-URL generation. Anonymous requests require authentication. The UI hides both file actions for Free and links to the plans page; metadata and external-source attribution remain available.

Both streamed files and signed redirects use `Cache-Control: private, no-store`. No PDFs were placed in the frontend's public/assets directory and no permanent storage URLs were exposed. Existing paid plans, prices and Stripe product IDs are unchanged.

## Artifact readiness and the V2 deployment

The local audit found **81 valid PDFs**, totaling **29,906,140 bytes**. The [artifact manifest](local-resource-artifacts.json) records each published resource's exact object key, byte count, source version and SHA-256 hash. It contains no credentials or signed URLs.

```powershell
# Read-only local audit; no upload and no database writes
pnpm exec tsx scripts/audit-local-resources.ts --out ../frontend/docs/local-resource-artifacts.json
```

The code deployment does not transport these files automatically: repository `storage/` is ignored and the backend Dockerfile copies code, dependencies and migrations, not local resource artifacts. This explains why local file availability does not prove availability in a deployed container. Production bucket contents/permissions were not accessed or changed in this task.

For production, publish/verify the PDFs in the existing **private** S3/R2-compatible storage and configure the backend's existing `RESOURCE_STORAGE_DRIVER=s3`, endpoint, bucket and server-side credentials through the deployment's secret management. Retain the exact manifest key, for example `resources/sur-emergency-planning-worksheet.pdf`, rather than uploading only the basename. The local default root already ends in `storage/resources`; the relative `resources/` key adds another directory level locally. In object storage, the key starts with just the manifest's `resources/` prefix.

Verify `artifact_available` and authenticated paid delivery after publishing. That flag can be false because an object is missing **or** because storage configuration/permissions prevent the server's existence check. A file in the local folder alone does not establish which condition applies in production. Keep the bucket private and let the authenticated backend authorize short-lived signed access; making the bucket public would defeat the plan gate. No production upload, deployment, customer update or subscription change was performed here.

## Validation evidence

The real local API was exercised with short-lived sessions belonging only to verified local mocks; those temporary sessions were revoked afterward. The paid mock received `200` for Community and a real `312,132`-byte PDF with PDF MIME/signature and attachment disposition. Free received `403` for Community, inline PDF access and attachment access. Anonymous download returned `401`. A local checkout returned `503` while Stripe billing/event table fingerprints remained unchanged.

Automated tests cover production/staging route absence, remote/misleading database hosts, real peer checks despite forged forwarding headers, identity tuple validation, provider-subscription preservation, customer-only record preservation, explicit false mock-flag parsing, Stripe SDK isolation, paid/Free file authorization, and browser requests proving no Stripe script/API traffic in local mode. The browser also verifies that denied local upgrades stay denied and Free has no PDF open/download links. Tests with database writes use only the dedicated disposable test database.

Final validation: **146 backend unit tests, 367 backend integration tests and 362 frontend tests passed**. The related desktop/mobile browser run passed 15 scenarios, with one existing mobile-only scenario skipped on desktop. Frontend/backend builds, generated API types and TypeScript checks passed. Lint has no errors; the frontend retains its five existing Fast Refresh warnings. The two HTTP boundary cases were rechecked after documenting their 401/403 responses in OpenAPI.
