# SetProof

**A certificate authority for the data that trains AI.**

SetProof is a decentralized quality certification protocol for AI training
datasets. Anyone submits a dataset URL, a claimed schema, and an intended
use case. GenLayer validators independently fetch a sample, reason about
five subjective quality dimensions with an LLM, reach consensus on a
canonical scorecard, and issue an on-chain certificate that other contracts
can query.

- **Live on:** GenLayer Bradbury (chain id `4221`)
- **Contract:** [`0x5C58CD851D5F55BbcfF782b29846A4376Ae88d36`](https://explorer-bradbury.genlayer.com/address/0x5C58CD851D5F55BbcfF782b29846A4376Ae88d36)
- **Deploy tx:** [`0xd71efa26a125a29aae618eb70ce132b39944e5205f928858d0de3d1f302280ec`](https://explorer-bradbury.genlayer.com/tx/0xd71efa26a125a29aae618eb70ce132b39944e5205f928858d0de3d1f302280ec)

## The problem

AI teams routinely download training datasets from public sources and
discover quality problems (skewed classes, mislabeled rows, silent
duplicates) only after burning thousands of dollars in training compute.
The current options are all bad: rule-based validators cannot judge bias
or relevance, centralized auditors do not scale, and existing decentralized
marketplaces only stake on data monetization, not on quality.

There is no trustless, composable quality primitive at the exact place in
the AI stack where trust is missing.

## What SetProof does

1. `assess_dataset(url, schema, use, sample_bytes)` submits a dataset for
   certification. Any GEN sent with the call is treated as a submission
   fee; a configurable slice (default 100 basis points) is forwarded to
   the fee recipient on finalization.
2. Every validator independently fetches a truncated sample of the URL,
   runs deterministic structural checks (schema conformance, null rate,
   duplicate rate) and asks an LLM to score five subjective dimensions on
   a 0-10 scale.
3. The `prompt_comparative` Equivalence Principle enforces agreement on
   `tier` and on each dimension's score bucket. If validators diverge,
   consensus retries.
4. The canonical scorecard is stored on chain under a deterministic
   `sp_NNNNNN` id. Other contracts can call `verify_quality(id, min_tier)`
   to gate their own logic on the certified tier.

### Quality dimensions

| Dimension       | What it captures                                        |
| --------------- | ------------------------------------------------------- |
| `bias`          | Representativeness, demographic and temporal skew.      |
| `relevance`     | Fit for the intended use case.                          |
| `label_quality` | Whether labels are accurate, consistent, meaningful.    |
| `diversity`     | Coverage of edge cases and variety of examples.         |
| `freshness`     | Temporal appropriateness for the claimed use case.      |

### Tiers

| Tier                | Overall score |
| ------------------- | ------------- |
| `TIER_1_EXCELLENT`  | ≥ 78          |
| `TIER_2_GOOD`       | 62 – 77       |
| `TIER_3_ACCEPTABLE` | 42 – 61       |
| `TIER_4_POOR`       | &lt; 42       |

Structural penalties (invalid schema, high null rate, high duplicate rate)
clamp the overall score independently of what the LLM returns, so a
model that is too generous cannot lift a broken dataset above `TIER_3`.

## How to use it

### From a browser

Open the hosted app, connect a wallet that has some Bradbury GEN
(claim from the [testnet faucet](https://testnet-faucet.genlayer.foundation/)),
paste a public CSV or JSON URL, and hit **Certify dataset**. The transaction
status pill shows every consensus phase and links to the block explorer.

### From TypeScript

```ts
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';

const client = createClient({ chain: testnetBradbury });

const cert = await client.readContract({
  address: '0x5C58CD851D5F55BbcfF782b29846A4376Ae88d36',
  functionName: 'get_certificate',
  args: ['sp_000000'],
});

const ok = await client.readContract({
  address: '0x5C58CD851D5F55BbcfF782b29846A4376Ae88d36',
  functionName: 'verify_quality',
  args: ['sp_000000', 'TIER_2_GOOD'],
});
```

### From another intelligent contract

```python
from genlayer import *

class DataMarket(gl.Contract):
    setproof: Address

    def __init__(self, setproof: str):
        self.setproof = Address(setproof)

    @gl.public.write
    def list_dataset(self, cert_id: str) -> None:
        cert = gl.get_contract_at(self.setproof)
        if not cert.view().verify_quality(cert_id, "TIER_2_GOOD"):
            raise gl.vm.UserError("[EXPECTED] insufficient quality")
        # ... list dataset for sale ...
```

## Tech

- **Contract:** single-file GenLayer Python intelligent contract with a
  pinned runner. See [`contracts/set_proof.py`](contracts/set_proof.py).
- **Consensus:** `gl.eq_principle.prompt_comparative` with a structural
  principle that requires tier and per-dimension bucket agreement plus
  ±12 point tolerance on the overall score.
- **Storage:** `TreeMap[str, str]` of canonical JSON payloads plus a
  `DynArray[str]` for ordered enumeration and a `TreeMap[str, str]`
  reverse index by URL. No floats in return values (all rates use
  integer basis points).
- **Frontend:** React 18 + Vite + `genlayer-js` 1.1.8. Two clients:
  a wallet-less read client for view calls, a wallet-bound write client
  for transactions. Full wallet lifecycle (connect, disconnect, account
  and chain change listeners, in-app switch to Bradbury via
  `client.connect("testnetBradbury")`).
- **Deploy pipeline:** `tools/deploy.mjs` uses `genlayer-js`
  `createClient` + `createAccount` + `deployContract` directly so
  `0x`-prefixed constructor strings are not mangled by CLI type inference.

## Repo layout

```
contracts/set_proof.py     — the intelligent contract
tools/deploy.mjs           — deploy script (Node + genlayer-js)
tools/seed.mjs             — end-to-end seeder for real dataset URLs
tests/direct/              — direct-mode tests (12, passing)
frontend/                  — React + Vite app (Vercel-deployable)
artifacts/deployment.json  — address + tx of the current deployment
vercel.json                — build config for the hosted site
```

## Development

Requires Python 3.12+, Node 22+.

```bash
# Contract testing
python3.12 -m venv .venv
. .venv/bin/activate
pip install genvm-linter genlayer-test
genvm-lint check contracts/set_proof.py
pytest tests/direct/ -v

# Deploy (needs .env with ACCOUNT_PRIVATE_KEY funded on Bradbury)
npm install
node tools/deploy.mjs

# Seed sample assessments
node tools/seed.mjs

# Frontend
cd frontend && npm install && npm run build
```

Frontend build output goes to `frontend/dist/`. Vercel picks up
`vercel.json` at the repo root and does the same steps automatically.

## Deployment on Vercel

Set no environment variables (the contract address is baked in). Push the
repo, connect it in Vercel, keep the default settings. The install and
build commands come from `vercel.json`.

If you fork and redeploy the contract, set `VITE_CONTRACT_ADDRESS` and
`VITE_DEPLOY_TX` in Vercel's env panel and rebuild.

## Verified on chain

- `get_config()` returns `{owner, fee_recipient, fee_bps: 100, dimensions,
  tiers, version: "1.0.0"}` with the deployer as both owner and fee
  recipient.
- Seeded assessments visible from the app read directly from the contract
  via `list_certificates`.

## Credits

Built on [GenLayer](https://docs.genlayer.com), whose Optimistic
Democracy consensus and Equivalence Principle make trustless subjective
adjudication possible without oracles.
