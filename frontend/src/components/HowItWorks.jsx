import React from 'react';

const STEPS = [
  {
    n: '01',
    title: 'Submit',
    body: 'Anyone calls assess_dataset(url, schema, use). The URL, claimed schema, and intended use are hashed into a deterministic assessment id.',
  },
  {
    n: '02',
    title: 'Sample',
    body: 'Each validator fetches the same byte-truncated sample from the dataset URL. Structural checks (schema, null rate, duplicate rate) run deterministically.',
  },
  {
    n: '03',
    title: 'Judge',
    body: 'Each validator independently prompts an LLM to score the five dimensions and produce a canonical scorecard.',
  },
  {
    n: '04',
    title: 'Certify',
    body: 'The Equivalence Principle enforces agreement on the tier and score buckets. On consensus, the scorecard is stored on chain and returned to the caller.',
  },
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <p className="section__eyebrow">How it works</p>
        <h2 className="section__title">
          Four steps from URL to composable on-chain certificate.
        </h2>
        <div className="grid grid--4">
          {STEPS.map((s) => (
            <div key={s.n} className="grid__cell">
              <span className="dim__name">step {s.n}</span>
              <h3
                className="dim__title"
                style={{ marginTop: 8, fontSize: 26 }}
              >
                {s.title}
              </h3>
              <p style={{ color: 'var(--ink-2)', marginTop: 12 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
