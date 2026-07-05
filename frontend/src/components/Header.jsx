import React from 'react';
import { LogoMark, Wordmark } from './Logo.jsx';
import { shortAddr } from '../lib/format.js';

export function Header({ wallet }) {
  const {
    address,
    onCorrectChain,
    connect,
    disconnect,
    connecting,
    expectedChainId,
    chainId,
  } = wallet;

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#top" className="brand">
          <LogoMark />
          <Wordmark />
        </a>
        <nav className="nav">
          <a href="#how">how it works</a>
          <a href="#dimensions">dimensions</a>
          <a href="#console">console</a>
          <a href="#developers">developers</a>
        </nav>
        {address ? (
          <div className="wallet" title={address}>
            <span
              className={
                'wallet__dot' + (onCorrectChain ? '' : ' wallet__dot--warn')
              }
            />
            <span>{shortAddr(address)}</span>
            {!onCorrectChain && (
              <button onClick={connect} title="Switch to Bradbury">
                switch → Bradbury
              </button>
            )}
            <button onClick={disconnect} aria-label="Disconnect wallet">
              disconnect
            </button>
          </div>
        ) : (
          <button
            className="btn btn--ghost"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? 'connecting…' : 'connect wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
