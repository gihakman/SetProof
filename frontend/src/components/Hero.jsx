import React from 'react';
import { CONTRACT_ADDRESS, DEPLOY_TX_HASH, EXPLORER } from '../config.js';
import { shortAddr, shortTx } from '../lib/format.js';

export function Hero() {
  return (
    <section className="section section--flush hero" id="top">
      <div className="container">
        <p className="section__eyebrow">Bradbury testnet · live</p>
        <h1 className="hero__title">
          A certificate authority for the data that <em>trains AI</em>.
        </h1>
        <p className="hero__lead">
          SetProof turns a dataset URL into an on-chain quality certificate.
          GenLayer validators independently fetch a sample, reason about five
          quality dimensions, reach consensus on a scorecard, and issue a
          certificate that other contracts can query.
        </p>
        <div className="row">
          <a className="btn" href="#console">
            open the console
          </a>
          <a className="btn btn--ghost" href="#how">
            how it works
          </a>
        </div>
        <div className="hero__chips">
          <span className="chip">
            <span className="chip__label">contract</span>
            <a
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(CONTRACT_ADDRESS)}
            </a>
          </span>
          <span className="chip">
            <span className="chip__label">deploy tx</span>
            <a
              href={`${EXPLORER}/tx/${DEPLOY_TX_HASH}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortTx(DEPLOY_TX_HASH)}
            </a>
          </span>
          <span className="chip">
            <span className="chip__label">chain</span>
            <span>Bradbury · 4221</span>
          </span>
          <span className="chip">
            <span className="chip__label">runtime</span>
            <span>py-genlayer · pinned</span>
          </span>
        </div>
      </div>
    </section>
  );
}
