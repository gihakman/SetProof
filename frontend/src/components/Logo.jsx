import React from 'react';

export function LogoMark({ size = 22 }) {
  return (
    <svg
      className="brand__mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="square"
      >
        <path d="M10 8 L4 8 L4 56 L10 56" />
        <path d="M54 8 L60 8 L60 56 L54 56" />
      </g>
      <rect x="20" y="20" width="24" height="24" fill="currentColor" />
      <rect x="24" y="24" width="16" height="16" fill="#1F7A3A" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="brand__word">
      SetProof<span className="brand__end" aria-hidden="true">∎</span>
    </span>
  );
}
