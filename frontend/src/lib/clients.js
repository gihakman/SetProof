import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { CONTRACT_ADDRESS } from '../config.js';

// Read client — no wallet required, used for all view-only calls.
let _readClient = null;
export function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: testnetBradbury });
  }
  return _readClient;
}

// Write client — needs a connected wallet address and provider.
export function getWriteClient(address, provider) {
  if (!address || !provider) return null;
  return createClient({
    chain: testnetBradbury,
    account: address,
    provider,
  });
}

/**
 * Retry a read call with exponential backoff.  gen_call is rate limited
 * per IP and the network occasionally returns transient errors while
 * validators are still processing.  This keeps the UI graceful without
 * hammering the RPC on cold pages.
 */
export async function readWithRetry(fn, { retries = 3, delay = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const wait = delay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/**
 * Convenience: run a read against the contract with automatic backoff.
 */
export async function readContract(functionName, args = []) {
  const client = getReadClient();
  return readWithRetry(() =>
    client.readContract({ address: CONTRACT_ADDRESS, functionName, args }),
  );
}
