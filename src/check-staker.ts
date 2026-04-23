#!/usr/bin/env tsx
/**
 * Minimal UZPROOF quest-completion check — Marinade-style loyalty
 * gate, expressed as a quest id.
 *
 *   npm run check -- FX3Zs3jKRs8cQcjymCJRwmzwNh11PxnxSXTmLA1Dci8Q 31
 *
 * Prints a signed attestation reference if the wallet completed
 * UZPROOF quest 31, exits 0 on hit, 1 on miss. Suitable for CI
 * gates, leaderboard filters, and airdrop snapshot pipelines.
 *
 * Replace quest id with whichever UZPROOF quest your dApp cares
 * about — see uzproof.com/docs for the current quest catalogue.
 */
import { getQuestCompletion } from "@uzproof/verify-reader";

async function main(): Promise<void> {
  const wallet = process.argv[2];
  const questIdArg = process.argv[3];
  if (!wallet || !questIdArg) {
    console.error("Usage: npm run check -- <wallet-address> <quest-id>");
    process.exit(2);
  }
  const questId = Number(questIdArg);
  if (!Number.isFinite(questId) || questId <= 0) {
    console.error(`Invalid quest id: ${questIdArg}`);
    process.exit(2);
  }

  const hit = await getQuestCompletion(wallet, questId);
  if (!hit) {
    console.log(`❌ ${wallet.slice(0, 8)}... has no UZPROOF attestation for quest ${questId}.`);
    process.exit(1);
  }

  console.log(`✅ ${wallet.slice(0, 8)}... completed UZPROOF quest ${questId}`);
  console.log(`   attestation: https://solscan.io/account/${hit.attestationAddress}`);
  if (hit.data) {
    console.log(`   protocol:    ${hit.data.protocol}`);
    console.log(`   amount USD:  $${hit.data.amountUsd.toFixed(2)}`);
    console.log(`   genuine:     ${hit.data.genuineScore}/100`);
    console.log(`   verified at: ${hit.data.verifiedAt.toISOString()}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(3);
});
