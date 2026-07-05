/**
 * The deployed SetProof address on GenLayer Bradbury is baked in so the hosted
 * site works without any environment configuration.  If VITE_CONTRACT_ADDRESS
 * is set at build time it overrides the default (useful for local forks).
 */

const DEFAULT_ADDRESS = '0x5C58CD851D5F55BbcfF782b29846A4376Ae88d36';
const DEFAULT_DEPLOY_TX =
  '0xd71efa26a125a29aae618eb70ce132b39944e5205f928858d0de3d1f302280ec';

export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || DEFAULT_ADDRESS
).toLowerCase().startsWith('0x')
  ? import.meta.env.VITE_CONTRACT_ADDRESS || DEFAULT_ADDRESS
  : DEFAULT_ADDRESS;

export const DEPLOY_TX_HASH =
  import.meta.env.VITE_DEPLOY_TX || DEFAULT_DEPLOY_TX;

export const EXPLORER = 'https://explorer-bradbury.genlayer.com';
export const RPC = 'https://rpc-bradbury.genlayer.com';
export const CHAIN_ID = 4221;
export const NETWORK_KEY = 'testnetBradbury';

// Local mirror of the tier lattice used by the on-chain contract.  The
// contract only stores the string tier, so the front-end formats and colors
// derive from this array's order.
export const TIERS = [
  'TIER_4_POOR',
  'TIER_3_ACCEPTABLE',
  'TIER_2_GOOD',
  'TIER_1_EXCELLENT',
];

export const DIMENSIONS = [
  {
    key: 'bias',
    label: 'Bias',
    blurb:
      'Representativeness and demographic, geographic, or temporal skew of the sample.',
  },
  {
    key: 'relevance',
    label: 'Relevance',
    blurb:
      'How well the sample matches the intended training use, both in domain and format.',
  },
  {
    key: 'label_quality',
    label: 'Label Quality',
    blurb:
      'Whether labels are accurate, internally consistent, and semantically meaningful.',
  },
  {
    key: 'diversity',
    label: 'Diversity',
    blurb:
      'Coverage of edge cases and variety of examples to prevent narrow overfitting.',
  },
  {
    key: 'freshness',
    label: 'Freshness',
    blurb:
      'Temporal appropriateness of the data for the claimed use case today.',
  },
];
