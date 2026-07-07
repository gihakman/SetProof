import React, { useState } from 'react';
import { useTx } from '../hooks/useTx.js';
import { TxStatus } from './TxStatus.jsx';
import { ExampleTiles, EXAMPLES } from './ExampleTiles.jsx';

const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation/';

export function SubmitForm({ wallet, onSubmitted }) {
  const [url, setUrl] = useState('');
  const [schema, setSchema] = useState('');
  const [use, setUse] = useState('');
  const [sampleBytes, setSampleBytes] = useState(4096);
  const [loadedKey, setLoadedKey] = useState(null);
  const { phase, txHash, error, submit, reset } = useTx();

  const busy = phase === 'wallet' || phase === 'submitted';
  const canSubmit =
    wallet.writeClient && url.trim() && schema.trim() && use.trim() && !busy;

  const onLoad = (ex) => {
    setUrl(ex.url);
    setSchema(ex.schema);
    setUse(ex.use);
    setSampleBytes(ex.bytes);
    setLoadedKey(ex.key);
    reset();
  };

  const onClear = () => {
    setUrl('');
    setSchema('');
    setUse('');
    setSampleBytes(4096);
    setLoadedKey(null);
    reset();
  };

  const onGo = async () => {
    const result = await submit(wallet.writeClient, 'assess_dataset', [
      url.trim(),
      schema.trim(),
      use.trim(),
      Number(sampleBytes) || 4096,
    ]);
    if (result && !result.error && onSubmitted) onSubmitted();
  };

  const walletState = (() => {
    if (!wallet.address) return { tone: 'off', text: 'connect a wallet to submit' };
    if (!wallet.onCorrectChain) return { tone: 'warn', text: 'wrong chain, switch to Bradbury' };
    return { tone: 'ok', text: 'wallet ready on Bradbury' };
  })();

  return (
    <div className="console__panel submit">
      <ExampleTiles onLoad={onLoad} activeKey={loadedKey} />

      <div className="submit__divider" />

      <div className="submit__head">
        <div>
          <p className="section__eyebrow" style={{ margin: 0 }}>
            submit
          </p>
          <h3 className="submit__title">Certify the loaded dataset.</h3>
        </div>
        <div className={`submit__state submit__state--${walletState.tone}`}>
          <span className="submit__state-dot" />
          <span>{walletState.text}</span>
          {!wallet.address ? null : wallet.onCorrectChain ? null : (
            <button
              type="button"
              className="submit__state-action"
              onClick={wallet.connect}
            >
              switch
            </button>
          )}
          {!wallet.address && (
            <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="submit__state-action">
              faucet
            </a>
          )}
        </div>
      </div>

      <div className="submit__grid">
        <div className="field">
          <label className="field__label" htmlFor="url">
            Dataset URL
          </label>
          <input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/…/data.csv"
            spellCheck={false}
          />
          <span className="field__hint">
            Public URL, CSV or JSON. Up to 16 KB is fetched per validator.
          </span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="bytes">
            Sample bytes
          </label>
          <input
            id="bytes"
            type="number"
            min={512}
            max={16384}
            step={512}
            value={sampleBytes}
            onChange={(e) => setSampleBytes(e.target.value)}
          />
          <span className="field__hint">512 to 16384. Larger samples slow consensus.</span>
        </div>

        <div className="field field--wide">
          <label className="field__label" htmlFor="schema">
            Claimed schema
          </label>
          <textarea
            id="schema"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="col_a,col_b,label"
            spellCheck={false}
          />
        </div>

        <div className="field field--wide">
          <label className="field__label" htmlFor="use">
            Intended use
          </label>
          <textarea
            id="use"
            value={use}
            onChange={(e) => setUse(e.target.value)}
            placeholder="What kind of model will this train?"
          />
        </div>
      </div>

      <div className="submit__actions">
        <button
          type="button"
          className="btn btn--signal"
          onClick={onGo}
          disabled={!canSubmit}
          title={
            !wallet.writeClient
              ? 'Connect a wallet on Bradbury first.'
              : undefined
          }
        >
          {busy ? 'certifying…' : 'certify dataset'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClear}
          disabled={busy || (!url && !schema && !use)}
        >
          clear
        </button>
        <span className="submit__count">
          {EXAMPLES.length} examples available
        </span>
      </div>

      {phase !== 'idle' && (
        <div style={{ marginTop: 16 }}>
          <TxStatus phase={phase} txHash={txHash} error={error} />
        </div>
      )}
    </div>
  );
}
