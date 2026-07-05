import { useCallback, useState } from 'react';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';
import { CONTRACT_ADDRESS } from '../config.js';

/**
 * Submits a write to the contract and tracks its progress through the
 * consensus lifecycle.  Exposes a `phase` field ('idle' | 'wallet' |
 * 'submitted' | 'accepted' | 'succeeded' | 'failed') plus the tx hash so
 * the UI can render a spinner and an explorer link.
 */
export function useTx() {
  const [phase, setPhase] = useState('idle');
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const submit = useCallback(async (writeClient, functionName, args, options = {}) => {
    if (!writeClient) {
      setError('Wallet is not connected.');
      setPhase('failed');
      return null;
    }
    setError(null);
    setReceipt(null);
    setTxHash(null);
    setPhase('wallet');

    let hash;
    try {
      hash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value: options.value ?? BigInt(0),
        // Bound gas so the tx cannot spin forever if consensus is unhappy.
        consensusMaxRotations: options.consensusMaxRotations ?? 3,
      });
    } catch (err) {
      if (err?.code === 4001) {
        setError('Wallet request was rejected.');
      } else {
        setError(err?.shortMessage || err?.message || 'Wallet request failed.');
      }
      setPhase('failed');
      return null;
    }
    setTxHash(hash);
    setPhase('submitted');

    try {
      const r = await writeClient.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        interval: 4000,
        retries: 90,
      });
      setReceipt(r);
      if (r.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN) {
        setPhase('succeeded');
      } else {
        setPhase('failed');
        setError(
          `Consensus accepted the tx but execution ended as ${r.txExecutionResultName}.`,
        );
      }
      return { hash, receipt: r };
    } catch (err) {
      setError(err?.shortMessage || err?.message || 'Tx confirmation timed out.');
      setPhase('failed');
      return { hash, error: err };
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setTxHash(null);
    setReceipt(null);
    setError(null);
  }, []);

  return { phase, txHash, receipt, error, submit, reset };
}
