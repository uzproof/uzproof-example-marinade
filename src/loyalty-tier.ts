#!/usr/bin/env tsx
/**
 * Loyalty tier mapping example — a Marinade-like integration where
 * benefits depend on which set of UZPROOF quests a wallet has
 * completed. Replace the quest ids with whatever set your protocol
 * cares about.
 *
 *   npm run tier -- FX3Zs3jKRs8cQcjymCJRwmzwNh11PxnxSXTmLA1Dci8Q
 *
 * Demonstrates the two-call pattern most real integrations use:
 *   1) verifyBatch — cheap existence check across many (wallet,
 *      quest) pairs
 *   2) getQuestCompletion — fetch typed data for the ones that matter
 *
 * Example logic:
 *   - Completed quest 31 AND 42  → Gold tier
 *   - Completed quest 31 only    → Silver tier
 *   - Neither                    → Bronze (default)
 *
 * Adjust the quest ids for your own programme.
 */
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { getQuestCompletion, verifyBatch } from "@uzproof/verify-reader";

type Tier = "Gold" | "Silver" | "Bronze";

interface TierResult {
  tier: Tier;
  reasons: string[];
  attestations: string[]; // Base58 addresses for audit trail
}

/* Quest ids the dApp rewards. Swap these for whatever your UZPROOF
 * integration cares about — see uzproof.com/docs for the live
 * catalogue. */
const REWARDED_QUESTS = {
  stakeSol: 31, // "UZPROOF quest 31 — Stake SOL with Marinade"
  holdLst: 42,  // "UZPROOF quest 42 — Hold mSOL for 30 days"
};

async function classify(wallet: string): Promise<TierResult> {
  const conn = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

  /* Cheap existence checks first. One batch call per action. */
  const stakeResults = await verifyBatch(
    [wallet],
    `quest_${REWARDED_QUESTS.stakeSol}`,
    conn,
  );
  const holdResults = await verifyBatch(
    [wallet],
    `quest_${REWARDED_QUESTS.holdLst}`,
    conn,
  );
  const hasStake = stakeResults.get(wallet) === true;
  const hasHold = holdResults.get(wallet) === true;

  const reasons: string[] = [];
  const attestations: string[] = [];

  let tier: Tier = "Bronze";

  if (hasStake && hasHold) {
    tier = "Gold";
    reasons.push(
      `Completed quest ${REWARDED_QUESTS.stakeSol} (stake) + quest ${REWARDED_QUESTS.holdLst} (sustained hold)`,
    );
  } else if (hasStake) {
    tier = "Silver";
    reasons.push(
      `Completed quest ${REWARDED_QUESTS.stakeSol} (stake); quest ${REWARDED_QUESTS.holdLst} (hold) not yet attested`,
    );
  } else {
    reasons.push("No UZPROOF quest attestations found — default Bronze tier");
  }

  /* Pull citation data only for the hits — keeps RPC usage minimal. */
  if (hasStake) {
    const hit = await getQuestCompletion(wallet, REWARDED_QUESTS.stakeSol, conn);
    if (hit) attestations.push(`quest_${REWARDED_QUESTS.stakeSol}:${hit.attestationAddress}`);
  }
  if (hasHold) {
    const hit = await getQuestCompletion(wallet, REWARDED_QUESTS.holdLst, conn);
    if (hit) attestations.push(`quest_${REWARDED_QUESTS.holdLst}:${hit.attestationAddress}`);
  }

  return { tier, reasons, attestations };
}

async function main(): Promise<void> {
  const wallet = process.argv[2];
  if (!wallet) {
    console.error("Usage: npm run tier -- <wallet-address>");
    process.exit(2);
  }

  const result = await classify(wallet);
  console.log(`Wallet:  ${wallet}`);
  console.log(`Tier:    ${result.tier}`);
  console.log(`Reasons:`);
  for (const r of result.reasons) console.log(`  - ${r}`);
  if (result.attestations.length > 0) {
    console.log(`Attestations (citable on-chain):`);
    for (const a of result.attestations) console.log(`  - ${a}`);
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(3);
});
