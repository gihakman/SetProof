import React from 'react';
import { useCertificate } from '../hooks/useCertificates.js';
import { DIMENSIONS } from '../config.js';
import {
  tierClass,
  tierLabel,
  fmtRateBps,
  fmtDate,
  shortAddr,
} from '../lib/format.js';

function Meter({ label, value }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 10) * 100));
  return (
    <div className="meter">
      <div className="meter__label">{label}</div>
      <div className="meter__bar">
        <div className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meter__value">{value ?? '—'}/10</div>
    </div>
  );
}

export function ScorecardDetail({ assessmentId }) {
  const { certificate, loading, error } = useCertificate(assessmentId);

  if (!assessmentId) {
    return (
      <div className="grid__cell" style={{ background: 'var(--paper-2)' }}>
        <p className="muted mono">
          Pick a certificate to see the full scorecard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid__cell">
        <p className="muted mono">loading certificate…</p>
      </div>
    );
  }
  if (error || !certificate) {
    return (
      <div className="grid__cell">
        <p className="error">{error || 'Certificate not found.'}</p>
      </div>
    );
  }

  const sc = certificate.scorecard || {};
  const dims = sc.dimensions || {};
  const structural = sc.structural || {};

  return (
    <div className="grid__cell" style={{ padding: 32 }}>
      <div className="scorecard">
        <div>
          <p className="section__eyebrow" style={{ marginBottom: 12 }}>
            certificate {certificate.assessment_id}
          </p>
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 28,
              margin: '0 0 12px',
            }}
          >
            {certificate.intended_use}
          </h3>
          <div className={`tier ${tierClass(certificate.tier)}`}>
            <span className="tier__dot" />
            {tierLabel(certificate.tier)}
          </div>
        </div>

        <div className="scorecard__grade">
          <div className="scorecard__score">
            {sc.overall_score ?? '—'}
            <sup>/100</sup>
          </div>
          <div className="muted mono">
            aggregated from five dimensions and structural checks
          </div>
        </div>

        <div>
          {DIMENSIONS.map((d) => (
            <Meter key={d.key} label={d.label} value={dims[d.key]} />
          ))}
        </div>

        <div>
          <p className="section__eyebrow">Analysis</p>
          <p style={{ color: 'var(--ink-2)', margin: 0 }}>
            {sc.analysis || '—'}
          </p>
          {sc.concerns && sc.concerns.length > 0 && (
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {sc.concerns.map((c, i) => (
                <li key={i} style={{ marginBottom: 6, fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <dl className="scorecard__meta">
          <div>
            <dt>Dataset</dt>
            <dd>
              <a href={certificate.dataset_url} target="_blank" rel="noreferrer">
                {certificate.dataset_url}
              </a>
            </dd>
          </div>
          <div>
            <dt>Schema claim</dt>
            <dd>{certificate.schema_claim}</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>{structural.format || '—'}</dd>
          </div>
          <div>
            <dt>Schema valid</dt>
            <dd>{String(structural.schema_valid)}</dd>
          </div>
          <div>
            <dt>Null rate</dt>
            <dd>{fmtRateBps(structural.null_rate_bps)}</dd>
          </div>
          <div>
            <dt>Duplicate rate</dt>
            <dd>{fmtRateBps(structural.duplicate_rate_bps)}</dd>
          </div>
          <div>
            <dt>Rows / cols</dt>
            <dd>
              {structural.row_count ?? '—'} / {structural.column_count ?? '—'}
            </dd>
          </div>
          <div>
            <dt>Submitter</dt>
            <dd>{shortAddr(certificate.submitter)}</dd>
          </div>
          <div>
            <dt>Certified at</dt>
            <dd>{fmtDate(certificate.timestamp)}</dd>
          </div>
        </dl>

        {sc.sample_preview && (
          <div>
            <p className="section__eyebrow">First bytes fetched</p>
            <pre
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                background: 'var(--paper-2)',
                border: '1px solid var(--hair)',
                padding: 12,
                overflow: 'auto',
                maxHeight: 200,
                margin: 0,
              }}
            >
              {sc.sample_preview}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
