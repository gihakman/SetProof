import React from 'react';
import { LogoMark } from './Logo.jsx';
import { GitHubIcon } from './GitHubIcon.jsx';
import {
  CONTRACT_ADDRESS,
  DEPLOY_TX_HASH,
  EXPLORER,
  GITHUB_URL,
} from '../config.js';
import { shortAddr, shortTx } from '../lib/format.js';

export function Footer() {
  return (
    <footer className="site-footer" id="colophon">
      <div className="container">
        <div className="row">
          <LogoMark size={16} />
          <span>
            SetProof — a decentralized quality certificate authority for AI training data.
          </span>
        </div>
        <div className="row">
          <a
            href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            contract {shortAddr(CONTRACT_ADDRESS)}
          </a>
          <a
            href={`${EXPLORER}/tx/${DEPLOY_TX_HASH}`}
            target="_blank"
            rel="noreferrer"
          >
            deploy {shortTx(DEPLOY_TX_HASH)}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="footer-link footer-link--icon"
            aria-label="Source on GitHub"
          >
            <GitHubIcon size={14} />
            <span>source</span>
          </a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
            genlayer
          </a>
        </div>
      </div>
    </footer>
  );
}
