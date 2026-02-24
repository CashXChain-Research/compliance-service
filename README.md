# CashXChain Compliance Service

Compliance precheck, list management (blacklist/whitelist), and audit for CashXChain.

## Structure

```
src/
  server.ts           # Fastify app entry
  routes/
    precheck.ts       # Precheck API
    lists.ts          # Blacklist/whitelist API
    audit.ts          # Audit API
  domain/
    policyEngine.ts   # Policy evaluation
    rules/
      blacklistWhitelist.ts
      thresholds.ts
      kycStatus.ts
    decisionSigner.ts
  db/
    prisma.ts         # Prisma client
  utils/
    logger.ts
    validate.ts
prisma/
  schema.prisma
infra/
  docker-compose.yml  # Postgres for local dev
```

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`.

2. **Database** (choose one):
   - **With Docker (Windows):** Install [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/), start it, then run:
     ```powershell
     docker compose -f infra/docker-compose.yml up -d
     ```
   - **Without Docker:** Use a local Postgres or a hosted DB (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com)). Put the connection string in `.env` as `DATABASE_URL`.

3. Migrate: `npx prisma migrate dev`
4. Run: `npm run dev`

## Scripts

- `npm run dev` – start with ts-node-dev
- `npm run build` – compile TypeScript
- `npm start` – run compiled app

## Integration pattern

Flow: client requests a compliance decision; only if the decision is **ALLOW** does the submitter send the transaction onchain.

```text
sequence diagram
participant Client
participant ComplianceService
participant ChainSubmitter
participant Onchain

Client->>ComplianceService: POST /v1/precheck (sender, receiver, amount, ...)
ComplianceService->>ComplianceService: policy engine (rules)
ComplianceService-->>Client: decisionId, status, reasons, signedDecisionToken

alt status == ALLOW
  Client->>ChainSubmitter: submit tx + signedDecisionToken
  ChainSubmitter->>ComplianceService: POST /v1/verify-decision-token { token }
  ComplianceService-->>ChainSubmitter: valid, decoded, dbCheck
  ChainSubmitter->>Onchain: submit tx (only if valid && status ALLOW && dbCheck.statusMatch)
else status == BLOCK or REVIEW
  Client does not submit (or escalates for REVIEW)
end
```

**No decision, no tx:** the chain submitter must require a valid decision token and only submit when the service says **ALLOW** and the DB check matches.

Example (submitter enforcing "no decision, no tx"):

```javascript
// Submitter: do not submit tx until compliance returns ALLOW and token verifies
async function submitIfCompliant(txPayload, signedDecisionToken) {
  const res = await fetch('https://compliance.example.com/v1/verify-decision-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: signedDecisionToken }),
  });
  const data = await res.json();
  if (res.status !== 200 || !data.valid || data.decoded?.status !== 'ALLOW') {
    throw new Error('Compliance check failed: no valid ALLOW decision');
  }
  if (!data.dbCheck?.statusMatch) {
    throw new Error('Compliance decision no longer valid (DB status mismatch)');
  }
  // Optional: assert decoded amounts/parties match txPayload
  return submitToChain(txPayload);
}
```