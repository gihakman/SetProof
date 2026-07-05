import React from 'react';
import { CONTRACT_ADDRESS, EXPLORER } from '../config.js';

const READ_SNIPPET = `import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const client = createClient({ chain: testnetBradbury });

const ok = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  functionName: 'verify_quality',
  args: ['sp_000000', 'TIER_2_GOOD'],
});
// ok === true if the dataset was certified at TIER_2_GOOD or better.
`;

const WRITE_SNIPPET = `import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const client = createClient({
  chain: testnetBradbury,
  account: createAccount(process.env.PRIVATE_KEY),
});

const txHash = await client.writeContract({
  address: '${CONTRACT_ADDRESS}',
  functionName: 'assess_dataset',
  args: [
    'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
    'sepal_length,sepal_width,petal_length,petal_width,species',
    'multiclass classification',
    4096,
  ],
  value: 0n,
});
`;

const CROSS_CONTRACT_SNIPPET = `# In another intelligent contract:
from genlayer import *

class DataMarket(gl.Contract):
    setproof: Address

    def __init__(self, setproof: str):
        self.setproof = Address(setproof)

    @gl.public.write
    def list_dataset(self, cert_id: str) -> None:
        cert = gl.get_contract_at(self.setproof)
        # Reject listings that failed at least a Good tier assessment.
        if not cert.view().verify_quality(cert_id, "TIER_2_GOOD"):
            raise gl.vm.UserError("[EXPECTED] insufficient quality")
        # ...list dataset for sale...
`;

function CodeBlock({ children, lang }) {
  return (
    <pre
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 12,
        lineHeight: 1.55,
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: 20,
        margin: 0,
        overflow: 'auto',
      }}
    >
      <code>{children}</code>
      {lang && (
        <div
          style={{
            position: 'sticky',
            bottom: -20,
            fontSize: 10,
            color: 'var(--paper-3)',
            textAlign: 'right',
            padding: '4px 0 0',
          }}
        >
          {lang}
        </div>
      )}
    </pre>
  );
}

export function Developers() {
  return (
    <section className="section" id="developers">
      <div className="container">
        <p className="section__eyebrow">developers</p>
        <h2 className="section__title">
          Integrate a quality check in three lines.
        </h2>
        <p className="section__lead">
          Certificates are on-chain, so any GenLayer, EVM, or off-chain
          consumer can query them. Below are copy-paste examples.
        </p>

        <div className="grid grid--3" style={{ marginTop: 24 }}>
          <div className="grid__cell">
            <span className="dim__name">contract</span>
            <p className="mono" style={{ wordBreak: 'break-all', fontSize: 13 }}>
              <a
                href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                {CONTRACT_ADDRESS}
              </a>
            </p>
            <span className="dim__name" style={{ marginTop: 12 }}>
              chain
            </span>
            <p className="mono" style={{ fontSize: 13 }}>
              Genlayer Bradbury · 4221
            </p>
          </div>
          <div className="grid__cell">
            <span className="dim__name">view methods</span>
            <ul className="mono" style={{ paddingLeft: 20, fontSize: 12 }}>
              <li>get_config()</li>
              <li>count()</li>
              <li>get_certificate(id)</li>
              <li>get_latest_for_url(url)</li>
              <li>list_certificates(offset, limit)</li>
              <li>verify_quality(id, min_tier)</li>
            </ul>
          </div>
          <div className="grid__cell">
            <span className="dim__name">write methods</span>
            <ul className="mono" style={{ paddingLeft: 20, fontSize: 12 }}>
              <li>assess_dataset(url, schema, use, sample_bytes)</li>
            </ul>
            <span className="dim__name" style={{ marginTop: 12 }}>
              runtime
            </span>
            <p className="mono" style={{ fontSize: 12 }}>py-genlayer · pinned</p>
          </div>
        </div>

        <div style={{ marginTop: 40 }} className="stack">
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              margin: '0 0 4px',
            }}
          >
            Read a certificate from JavaScript.
          </h3>
          <CodeBlock lang="typescript">{READ_SNIPPET}</CodeBlock>

          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              margin: '24px 0 4px',
            }}
          >
            Submit a new assessment.
          </h3>
          <CodeBlock lang="typescript">{WRITE_SNIPPET}</CodeBlock>

          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              margin: '24px 0 4px',
            }}
          >
            Gate another contract on quality.
          </h3>
          <CodeBlock lang="python">{CROSS_CONTRACT_SNIPPET}</CodeBlock>
        </div>
      </div>
    </section>
  );
}
