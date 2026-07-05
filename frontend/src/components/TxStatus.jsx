import React from 'react';
import { explorerTx, shortTx } from '../lib/format.js';

const PHASE_LABELS = {
  wallet: 'waiting for wallet signature…',
  submitted: 'submitted, awaiting consensus…',
  succeeded: 'accepted by consensus',
  failed: 'transaction failed',
};

export function TxStatus({ phase, txHash, error }) {
  if (phase === 'idle') return null;
  const label = PHASE_LABELS[phase] || phase;
  const cls =
    phase === 'succeeded'
      ? 'tx-status__phase--ok'
      : phase === 'failed'
      ? 'tx-status__phase--fail'
      : '';
  const showSpinner = phase === 'wallet' || phase === 'submitted';

  return (
    <div className="tx-status">
      <div className="tx-status__row">
        <span className={`tx-status__phase ${cls}`}>
          {showSpinner && <span className="spinner" />}
          <b>{label}</b>
        </span>
        {txHash && (
          <a href={explorerTx(txHash)} target="_blank" rel="noreferrer">
            {shortTx(txHash)} ↗
          </a>
        )}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
