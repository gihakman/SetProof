import React from 'react';
import { DIMENSIONS } from '../config.js';

export function Dimensions() {
  return (
    <section className="section" id="dimensions">
      <div className="container">
        <p className="section__eyebrow">The scorecard</p>
        <h2 className="section__title">
          Five dimensions, scored 0-10, and one composable tier.
        </h2>
        <p className="section__lead">
          Deterministic rules alone cannot answer whether a dataset is biased,
          labeled well, or actually about the thing it claims. Each validator
          reasons about these dimensions with an LLM, then the Equivalence
          Principle enforces agreement on the tier and score buckets.
        </p>

        <div className="grid grid--5">
          {DIMENSIONS.map((d, i) => (
            <div key={d.key} className="grid__cell dim">
              <span className="dim__name">
                {String(i + 1).padStart(2, '0')} · {d.label}
              </span>
              <span className="dim__title">{d.blurb}</span>
            </div>
          ))}
        </div>

        <div className="grid grid--4" style={{ marginTop: 40 }}>
          <div className="grid__cell">
            <div className="tier tier--t1">
              <span className="tier__dot" />
              Excellent
            </div>
            <p className="muted mono" style={{ marginTop: 10 }}>
              score ≥ 78
            </p>
          </div>
          <div className="grid__cell">
            <div className="tier tier--t2">
              <span className="tier__dot" />
              Good
            </div>
            <p className="muted mono" style={{ marginTop: 10 }}>
              62 – 77
            </p>
          </div>
          <div className="grid__cell">
            <div className="tier tier--t3">
              <span className="tier__dot" />
              Acceptable
            </div>
            <p className="muted mono" style={{ marginTop: 10 }}>
              42 – 61
            </p>
          </div>
          <div className="grid__cell">
            <div className="tier tier--t4">
              <span className="tier__dot" />
              Poor
            </div>
            <p className="muted mono" style={{ marginTop: 10 }}>
              &lt; 42
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
