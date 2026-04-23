# uzproof-example-marinade

Reference integration showing how a Solana dApp (Marinade-style)
consumes **UZPROOF quest-completion attestations** to gate loyalty
tiers, airdrop eligibility, or reward badges on genuine on-chain
activity.

**Stack:** `@uzproof/verify-reader` + `@solana/web3.js`. No API keys.
No UZPROOF account. No on-chain writes from this code.

## Why this exists

UZPROOF writes SAS (Solana Attestation Service) attestations every
time a wallet completes a verified UZPROOF quest. These attestations
are permanent, portable, and cryptographically signed on Solana
mainnet.

Your protocol reads them. This repo shows how, in under 30 lines of
code.

## Data model (important)

UZPROOF's current Paid Claim flow writes **one attestation per
quest**, keyed by `action = "quest_<id>"`. So to check "did this
wallet complete my loyalty-worthy quest?", you pass the UZPROOF
quest id:

```typescript
import { hasQuestCompletion } from "@uzproof/verify-reader";
const eligible = await hasQuestCompletion(wallet, 31);
```

See [uzproof.com/docs](https://uzproof.com/docs) for the current
quest catalogue and what actions each quest verifies on-chain.

## Quickstart

```bash
npm install
npm run check -- FX3Zs3jKRs8cQcjymCJRwmzwNh11PxnxSXTmLA1Dci8Q 31
```

Output:

```
✅ FX3Zs3jK... completed UZPROOF quest 31
   attestation: https://solscan.io/account/<attestation-pda>
   protocol:    DeFi
   amount USD:  $0.00
   genuine:     87/100
   verified at: 2026-04-10T14:23:00.000Z
```

> **SDK availability:** `@uzproof/verify-reader@0.1.0` is live on
> npm as of 2026-04-23 — plain `npm install @uzproof/verify-reader`
> resolves correctly. No extra setup needed.

## What's in the box

### `src/check-staker.ts`

The minimum viable integration. One function call
(`getQuestCompletion`), prints an attestation reference if the wallet
completed the given UZPROOF quest.

Use in CI, snapshot pipelines, or cron jobs that filter candidate
wallets.

### `src/loyalty-tier.ts`

A more realistic pattern: classify a wallet into Bronze / Silver /
Gold tier based on *which* UZPROOF quests it has completed. Uses
`verifyBatch` for cheap existence checks first, then
`getQuestCompletion` only for citation data on hits.

```bash
npm run tier -- FX3Zs3jKRs8cQcjymCJRwmzwNh11PxnxSXTmLA1Dci8Q
```

## Integration pattern

```typescript
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { verifyBatch } from "@uzproof/verify-reader";

// Your paid RPC for batch workloads
const conn = new Connection("https://mainnet.helius-rpc.com/?api-key=...");

// Filter a candidate list down to wallets that completed quest 42
const candidates = [/* wallet addresses */];
const verifiedMap = await verifyBatch(candidates, "quest_42", conn);
const eligible = candidates.filter((w) => verifiedMap.get(w) === true);
```

That's the whole playbook. 3 lines for airdrop filtering, 5 lines
for a loyalty tier.

## Why SAS, why UZPROOF

- **Portable credentials** — your verified Marinade user arrives at
  Sanctum already pre-verified. Network effects favour protocols that
  share a reputation layer.
- **No user friction** — UZPROOF writes the attestation on-chain
  using the user's own payment (Paid Claim flow, user-signed).
- **Cryptographic proof** — every attestation is a signed account on
  SAS mainnet. Your users can verify it independently at any time.
- **Anti-sybil built-in** — UZPROOF runs 8 anti-sybil signals before
  issuing an attestation, so `genuineScore` is meaningful.

## License

MIT © UZPROOF

## Related

- [`@uzproof/verify-reader`](https://www.npmjs.com/package/@uzproof/verify-reader) — reader SDK
- [`@uzproof/verify`](https://www.npmjs.com/package/@uzproof/verify) — writer SDK (pay-per-call x402)
- [uzproof.com/docs](https://uzproof.com/docs) — full documentation
- [uzproof.com/stats](https://uzproof.com/stats) — live traction metrics
