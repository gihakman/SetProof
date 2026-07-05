import React from 'react';
import { tierClass, tierLabel, shortAddr } from '../lib/format.js';

export function CertificateList({
  certificates,
  loading,
  error,
  onRefresh,
  onSelect,
  selectedId,
}) {
  return (
    <div className="console__panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <div>
          <p className="section__eyebrow" style={{ margin: 0 }}>
            on-chain certificates
          </p>
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 26,
              margin: '4px 0 0',
            }}
          >
            {certificates.length ? `${certificates.length} certified` : 'browse'}
          </h3>
        </div>
        <button className="btn btn--ghost" onClick={onRefresh} disabled={loading}>
          {loading ? 'loading…' : 'refresh'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {!error && !loading && certificates.length === 0 && (
        <p className="muted mono">
          No certificates yet. Submit one on the right to be the first.
        </p>
      )}

      <div className="stack">
        {certificates.map((cert) => {
          const sc = cert.scorecard || {};
          const active = selectedId === cert.assessment_id;
          return (
            <div
              key={cert.assessment_id}
              className="certificate"
              style={
                active
                  ? { background: 'var(--paper-2)', borderColor: 'var(--ink)' }
                  : undefined
              }
              onClick={() => onSelect(cert.assessment_id)}
            >
              <div className="certificate__head">
                <div>
                  <div className="certificate__id">
                    {cert.assessment_id} · sample {cert.sample_bytes} B
                  </div>
                  <div className="certificate__use">{cert.intended_use}</div>
                </div>
                <div className={`tier ${tierClass(cert.tier)}`}>
                  <span className="tier__dot" />
                  {tierLabel(cert.tier)}
                </div>
              </div>
              <div className="certificate__url">{cert.dataset_url}</div>
              <div className="certificate__stats">
                <span className="certificate__stat">
                  score <b>{sc.overall_score ?? '—'}/100</b>
                </span>
                <span className="certificate__stat">
                  format <b>{sc.structural?.format ?? '—'}</b>
                </span>
                <span className="certificate__stat">
                  rows <b>{sc.structural?.row_count ?? '—'}</b>
                </span>
                <span className="certificate__stat">
                  cols <b>{sc.structural?.column_count ?? '—'}</b>
                </span>
                <span className="certificate__stat">
                  by <b>{shortAddr(cert.submitter)}</b>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
