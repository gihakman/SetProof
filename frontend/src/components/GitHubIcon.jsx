import React from 'react';

/**
 * GitHub "mark-github" glyph, taken from the Octicons set (MIT license).
 * currentColor lets it pick up whatever text color it lives inside.
 */
export function GitHubIcon({ size = 20, className = '', title = 'GitHub' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.94c.58.11.79-.25.79-.56v-2.03c-3.2.7-3.87-1.36-3.87-1.36-.53-1.36-1.29-1.72-1.29-1.72-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.26 5.65.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}
