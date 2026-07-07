import React from 'react';
import { LogoMark, Wordmark } from './Logo.jsx';
import { GitHubIcon } from './GitHubIcon.jsx';
import { GITHUB_URL } from '../config.js';
import { shortAddr } from '../lib/format.js';

export function Header({ wallet }) {
  const {
    address,
    onCorrectChain,
    connect,
    disconnect,
    connecting,
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
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="icon-link"
          aria-label="Source on GitHub"
          title="Source on GitHub"
        >
          <GitHubIcon size={18} />
        </a>
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
