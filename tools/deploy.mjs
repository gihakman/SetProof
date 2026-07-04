/**
 * Deploys the SetProof intelligent contract to GenLayer Bradbury using
 * genlayer-js directly. This avoids CLI type-inference quirks around
 * "0x…" strings by passing typed calldata.
 *
 * Usage:
 *   node tools/deploy.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';

const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY;
if (!ACCOUNT_PRIVATE_KEY) {
  console.error('ERROR: ACCOUNT_PRIVATE_KEY is not set in the environment.');
  process.exit(1);
}

const FEE_RECIPIENT = (process.env.FEE_RECIPIENT || '').trim();
const FEE_BPS = Number.parseInt(process.env.FEE_BPS || '100', 10);
if (!Number.isInteger(FEE_BPS) || FEE_BPS < 0 || FEE_BPS > 10000) {
  console.error(`ERROR: FEE_BPS "${process.env.FEE_BPS}" is not a valid basis-point integer.`);
  process.exit(1);
}

const contractPath = path.resolve('contracts/set_proof.py');
const contractCode = new Uint8Array(readFileSync(contractPath));

const account = createAccount(ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

const feeRecipientArg = FEE_RECIPIENT || '0x0000000000000000000000000000000000000000';
console.log(`Deploying SetProof to Bradbury (chainId=${testnetBradbury.id})`);
console.log(`  contract: contracts/set_proof.py (${contractCode.length} bytes)`);
console.log(`  fee_recipient: ${feeRecipientArg}`);
console.log(`  fee_bps:       ${FEE_BPS}`);

const txHash = await client.deployContract({
  code: contractCode,
  args: [feeRecipientArg, FEE_BPS],
});
console.log(`deploy tx: ${txHash}`);

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED,
  interval: 3000,
  retries: 200,
});

const executionName = receipt.txExecutionResultName;
console.log(`status: ${receipt.statusName}`);
console.log(`execution: ${executionName}`);

if (executionName !== ExecutionResult.FINISHED_WITH_RETURN) {
  console.error('DEPLOY FAILED. Receipt for debugging:');
  console.error(JSON.stringify(receipt, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  process.exit(2);
}

const address =
  receipt.data?.contract_address ?? receipt.txDataDecoded?.contractAddress;
if (!address) {
  console.error('Deploy accepted but no contract address in receipt.');
  console.error(JSON.stringify(receipt, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  process.exit(2);
}

console.log(`\ncontract address: ${address}`);
console.log(`explorer:         https://explorer-bradbury.genlayer.com/tx/${txHash}`);

// Sanity view call.
try {
  const cfg = await client.readContract({
    address,
    functionName: 'get_config',
    args: [],
  });
  console.log('\nget_config():');
  console.log(JSON.stringify(cfg, null, 2));
} catch (err) {
  console.warn('view sanity check failed (contract may still be indexing):', err.message);
}

// Save a deployment record for the frontend to bake in.
const record = {
  contractAddress: address,
  deployTxHash: txHash,
  chainId: testnetBradbury.id,
  network: 'testnetBradbury',
  feeRecipient: feeRecipientArg,
  feeBps: FEE_BPS,
  deployedAt: new Date().toISOString(),
};
writeFileSync('artifacts/deployment.json', JSON.stringify(record, null, 2));
console.log('\nWrote artifacts/deployment.json');
