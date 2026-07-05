import React, { useState } from 'react';
import { useTx } from '../hooks/useTx.js';
import { TxStatus } from './TxStatus.jsx';

const PRESETS = [
  {
    label: 'Iris',
    url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
    schema: 'sepal_length,sepal_width,petal_length,petal_width,species',
    use: 'supervised multiclass classification of iris flower species from morphometric features',
    bytes: 4096,
  },
  {
    label: 'Titanic',
    url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    schema: 'PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked',
    use: 'binary classification of passenger survival on the RMS Titanic',
    bytes: 6144,
  },
];

export function SubmitForm({ wallet, onSubmitted }) {
  const [url, setUrl] = useState('');
  const [schema, setSchema] = useState('');
  const [use, setUse] = useState('');
  const [sampleBytes, setSampleBytes] = useState(4096);
  const { phase, txHash, error, submit, reset } = useTx();

  const busy = phase === 'wallet' || phase === 'submitted';
  const canSubmit =
    wallet.writeClient && url.trim() && schema.trim() && use.trim() && !busy;

  const onPreset = (p) => {
    setUrl(p.url);
    setSchema(p.schema);
    setUse(p.use);
    setSampleBytes(p.bytes);
    reset();
  };

  const onGo = async () => {
    const result = await submit(
      wallet.writeClient,
      'assess_dataset',
      [url.trim(), schema.trim(), use.trim(), Number(sampleBytes) || 4096],
    );
    if (result && !result.error && onSubmitted) onSubmitted();
  };

  return (
    <div className="console__panel">
      <p className="section__eyebrow">submit dataset</p>
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 26,
          margin: '0 0 20px',
        }}
      >
        Certify a public dataset.
      </h3>

      <div className="row" style={{ marginBottom: 20 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="btn btn--ghost"
            style={{ fontSize: 11 }}
            onClick={() => onPreset(p)}
          >
            use {p.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="url">
          Dataset URL
        </label>
        <input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://raw.githubusercontent.com/…/data.csv"
        />
        <span className="field__hint">
          Must be a public URL (CSV or JSON, {'<'} 16 KB is fetched).
        </span>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="schema">
          Claimed schema
        </label>
        <textarea
          id="schema"
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          placeholder="col_a,col_b,label"
        />
      </div>
      <div className="field">
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
        <span className="field__hint">
          512 – 16384. Larger samples slow consensus.
        </span>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <button
          className="btn btn--signal"
          onClick={onGo}
          disabled={!canSubmit}
          title={
            !wallet.writeClient
              ? 'Connect a wallet on Bradbury first'
              : undefined
          }
        >
          {busy ? 'certifying…' : 'certify dataset'}
        </button>
        {!wallet.address && (
          <span className="mono muted" style={{ fontSize: 11 }}>
            wallet required
          </span>
        )}
        {wallet.address && !wallet.onCorrectChain && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--stamp)' }}>
            wrong chain
          </span>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <TxStatus phase={phase} txHash={txHash} error={error} />
      </div>
    </div>
  );
}
