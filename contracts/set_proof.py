# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# SetProof — decentralized dataset quality certification.
#
# Anyone can submit a dataset URL plus a claimed schema and intended use case.
# The intelligent contract fetches a sample of the dataset, has GenLayer's
# validator set independently reason about five subjective quality dimensions
# (bias, relevance, label quality, diversity, freshness), reaches consensus on
# a canonical scorecard, and stores an on-chain certificate that other
# contracts can query.
#
# Consensus is reached via `gl.eq_principle.prompt_comparative`: validators
# re-run the assessment task and an LLM judge compares each independent
# scorecard against the leader's using a strict, structural principle.

from genlayer import *

import json
import re
import typing


# Error prefixes so validators know how to compare failure paths.
ERROR_EXPECTED = "[EXPECTED]"   # deterministic business logic
ERROR_EXTERNAL = "[EXTERNAL]"   # 4xx from the dataset host
ERROR_TRANSIENT = "[TRANSIENT]"  # 5xx / timeout
ERROR_LLM = "[LLM_ERROR]"       # LLM misbehavior

# Fixed quality dimensions. Order matters for canonical output.
DIMENSIONS: typing.Final = (
    "bias",
    "relevance",
    "label_quality",
    "diversity",
    "freshness",
)

TIERS: typing.Final = (
    "TIER_4_POOR",
    "TIER_3_ACCEPTABLE",
    "TIER_2_GOOD",
    "TIER_1_EXCELLENT",
)


class SetProof(gl.Contract):
    # --- storage ---------------------------------------------------------
    # Certificate payloads are stored as canonical JSON strings so that new
    # scorecard fields never break the on-chain layout.
    certificates: TreeMap[str, str]
    # Insertion-ordered list of assessment ids for pagination on the frontend.
    assessment_ids: DynArray[str]
    # Reverse index: dataset_url -> most recent assessment id.
    latest_by_url: TreeMap[str, str]

    # Deployer, protocol config.
    owner: Address
    fee_recipient: Address
    fee_bps: u32

    def __init__(self, fee_recipient: str, fee_bps: int) -> None:
        self.owner = gl.message.sender_address
        # Empty string falls back to deployer.
        if fee_recipient and fee_recipient != "0x0000000000000000000000000000000000000000":
            self.fee_recipient = Address(fee_recipient)
        else:
            self.fee_recipient = gl.message.sender_address
        # Clamp fee at 10% to keep the protocol honest.
        capped = fee_bps if fee_bps <= 1000 else 1000
        self.fee_bps = u32(max(0, capped))

    # --- views -----------------------------------------------------------

    @gl.public.view
    def get_config(self) -> dict:
        return {
            "owner": self.owner.as_hex,
            "fee_recipient": self.fee_recipient.as_hex,
            "fee_bps": int(self.fee_bps),
            "dimensions": list(DIMENSIONS),
            "tiers": list(TIERS),
            "version": "1.0.0",
        }

    @gl.public.view
    def count(self) -> int:
        return len(self.assessment_ids)

    @gl.public.view
    def get_certificate(self, assessment_id: str) -> dict:
        raw = self.certificates.get(assessment_id, "")
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {}

    @gl.public.view
    def get_latest_for_url(self, dataset_url: str) -> dict:
        assessment_id = self.latest_by_url.get(dataset_url, "")
        if not assessment_id:
            return {}
        return self.get_certificate(assessment_id)

    @gl.public.view
    def list_certificates(self, offset: int, limit: int) -> list:
        """Return the most recent certificates first, paginated."""
        total = len(self.assessment_ids)
        if total == 0 or limit <= 0:
            return []
        if offset < 0:
            offset = 0
        results: list[dict] = []
        # Walk newest first.
        end = total - offset
        start = max(0, end - limit)
        for i in range(end - 1, start - 1, -1):
            aid = self.assessment_ids[i]
            raw = self.certificates.get(aid, "")
            if raw:
                try:
                    results.append(json.loads(raw))
                except Exception:
                    continue
        return results

    @gl.public.view
    def verify_quality(self, assessment_id: str, min_tier: str) -> bool:
        """Composable check: returns True iff the certified tier meets or
        exceeds `min_tier`.  Callable from other contracts."""
        raw = self.certificates.get(assessment_id, "")
        if not raw:
            return False
        try:
            cert = json.loads(raw)
        except Exception:
            return False
        cert_tier = cert.get("tier", "TIER_4_POOR")
        if cert_tier not in TIERS or min_tier not in TIERS:
            return False
        return TIERS.index(cert_tier) >= TIERS.index(min_tier)

    # --- writes ----------------------------------------------------------

    @gl.public.write.payable
    def assess_dataset(
        self,
        dataset_url: str,
        schema_claim: str,
        intended_use: str,
        sample_bytes: int = 4096,
    ) -> str:
        """Submit a dataset for quality assessment.

        Any GEN sent with the call is treated as a submission fee: a portion
        (fee_bps) is forwarded to the protocol fee recipient on finalization,
        the rest stays on the contract balance."""

        # ---- deterministic validation --------------------------------------
        url = dataset_url.strip()
        if not (url.startswith("https://") or url.startswith("http://")):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} dataset_url must be http(s)")
        if len(url) > 512:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} dataset_url too long")
        if len(schema_claim) > 2048:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} schema_claim too long")
        if len(intended_use) > 1024:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} intended_use too long")
        # Guard: keep the fetched sample small so the tx stays bounded.
        cap = 512 if sample_bytes < 512 else sample_bytes
        cap = 16384 if cap > 16384 else cap

        # ---- fee split (deterministic) -------------------------------------
        paid = int(gl.message.value)
        if paid > 0 and int(self.fee_bps) > 0:
            fee = paid * int(self.fee_bps) // 10000
            if fee > 0:
                # Emit on finalized so the transfer only lands once consensus
                # has confirmed the certificate is legitimate.
                other = gl.get_contract_at(self.fee_recipient)
                other.emit_transfer(value=u256(fee), on="finalized")

        # Pre-compute the new id deterministically so validators agree.
        assessment_id = f"sp_{len(self.assessment_ids):06d}"
        submitter = gl.message.sender_address.as_hex
        try:
            timestamp_iso = str(gl.message_raw.get("datetime", ""))  # type: ignore[attr-defined]
        except Exception:
            timestamp_iso = ""

        # ---- consensus block ----------------------------------------------
        # The nondet block is fully self-contained: fetch -> deterministic
        # structural checks on the sample -> LLM scorecard.  Defining it as
        # a nested closure keeps the outer method deterministic from the
        # linter's point of view (no direct gl.nondet.* references here).
        def _assess() -> str:
            try:
                response = gl.nondet.web.get(url, headers={"Accept": "*/*"})
            except Exception as exc:
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} fetch failed: {type(exc).__name__}"
                )

            status = int(getattr(response, "status", 0))
            if status >= 500:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} host returned {status}")
            if status >= 400:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} host returned {status}")
            if status < 200:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} host returned {status}")

            body = response.body or b""
            if not body:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} empty response body")

            sample_bytes = body[:cap]
            try:
                sample_text = sample_bytes.decode("utf-8", errors="replace")
            except Exception:
                sample_text = ""

            structural = _analyze_structure(sample_text)
            prompt = _build_prompt(
                url, schema_claim, intended_use, sample_text, structural
            )
            try:
                raw = gl.nondet.exec_prompt(prompt, response_format="json")
            except Exception as exc:
                raise gl.vm.UserError(
                    f"{ERROR_LLM} exec_prompt failed: {type(exc).__name__}"
                )

            analysis_obj = _parse_llm_output(raw)
            scores = {
                d: _clamp_score(analysis_obj.get("dimensions", {}).get(d))
                for d in DIMENSIONS
            }
            overall_score = int(
                round(sum(scores.values()) * 100.0 / (len(DIMENSIONS) * 10.0))
            )
            if not structural["schema_valid"]:
                overall_score = min(overall_score, 55)
            if structural["null_rate_bps"] > 2000:
                overall_score = min(overall_score, 60)
            if structural["duplicate_rate_bps"] > 3000:
                overall_score = min(overall_score, 55)

            tier = _tier_for(overall_score)

            concerns_raw = analysis_obj.get("concerns", [])
            if not isinstance(concerns_raw, list):
                concerns_raw = []
            concerns = [str(c)[:180] for c in concerns_raw[:6]]
            analysis_text = str(analysis_obj.get("analysis", ""))[:1200]

            scorecard = {
                "dimensions": scores,
                "overall_score": overall_score,
                "tier": tier,
                "structural": structural,
                "analysis": analysis_text,
                "concerns": concerns,
                "sample_preview": sample_text[:240],
            }
            return json.dumps(scorecard, sort_keys=True, separators=(",", ":"))

        certificate_json = gl.eq_principle.prompt_comparative(
            _assess,
            principle=(
                "The two scorecards describe the same dataset. Consider them "
                "equivalent when ALL of the following hold: (1) the `tier` "
                "field is exactly identical; (2) `overall_score` differs by "
                "at most 15 points; (3) the `structural.schema_valid` field "
                "matches; (4) `structural.null_rate_bps` and "
                "`structural.duplicate_rate_bps` each differ by at most 800 "
                "basis points; (5) each dimension score in `dimensions` "
                "differs by at most 3 points. Textual `analysis`, "
                "`concerns`, and `sample_preview` may differ in wording as "
                "long as they discuss the same substantive quality issues."
            ),
        )

        try:
            scorecard = json.loads(certificate_json)
        except Exception:
            raise gl.vm.UserError(f"{ERROR_LLM} invalid scorecard JSON")

        record = {
            "assessment_id": assessment_id,
            "dataset_url": url,
            "schema_claim": schema_claim,
            "intended_use": intended_use,
            "sample_bytes": int(cap),
            "submitter": submitter,
            "timestamp": timestamp_iso,
            "scorecard": scorecard,
            "tier": scorecard.get("tier", "TIER_4_POOR"),
        }
        payload = json.dumps(record, sort_keys=True, separators=(",", ":"))

        self.certificates[assessment_id] = payload
        self.assessment_ids.append(assessment_id)
        self.latest_by_url[url] = assessment_id

        return assessment_id


# ---------- module-level helpers (kept out of the class for clarity) --------

def _tier_for(score: int) -> str:
    if score >= 78:
        return "TIER_1_EXCELLENT"
    if score >= 62:
        return "TIER_2_GOOD"
    if score >= 42:
        return "TIER_3_ACCEPTABLE"
    return "TIER_4_POOR"


def _clamp_score(value: typing.Any) -> int:
    try:
        n = int(round(float(str(value).strip())))
    except (TypeError, ValueError):
        return 0
    if n < 0:
        return 0
    if n > 10:
        return 10
    return n


def _analyze_structure(sample: str) -> dict:
    """Cheap deterministic structural checks on the fetched sample."""
    trimmed = sample.strip()
    if not trimmed:
        return {
            "format": "unknown",
            "schema_valid": False,
            "null_rate_bps": 10000,
            "duplicate_rate_bps": 0,
            "row_count": 0,
            "column_count": 0,
        }

    # Cheap format sniffing.
    if trimmed[0] in "[{":
        return _analyze_json(trimmed)
    return _analyze_csv(trimmed)


def _rate_bps(numer: int, denom: int) -> int:
    """Return a rate as integer basis points (0..10000)."""
    if denom <= 0:
        return 0
    r = int(round(numer * 10000 / denom))
    if r < 0:
        return 0
    if r > 10000:
        return 10000
    return r


def _analyze_json(sample: str) -> dict:
    # Try parsing directly; if it looks like NDJSON, split on newlines.
    parsed: typing.Any = None
    try:
        parsed = json.loads(sample)
    except Exception:
        # NDJSON fallback: parse whole lines until we hit an incomplete one.
        rows = []
        for line in sample.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                break
        parsed = rows if rows else None

    if parsed is None:
        return {
            "format": "json_broken",
            "schema_valid": False,
            "null_rate_bps": 10000,
            "duplicate_rate_bps": 0,
            "row_count": 0,
            "column_count": 0,
        }

    if isinstance(parsed, dict):
        rows_container = None
        for key in ("data", "rows", "items", "records", "results"):
            v = parsed.get(key)
            if isinstance(v, list):
                rows_container = v
                break
        rows = rows_container if rows_container is not None else [parsed]
    elif isinstance(parsed, list):
        rows = parsed
    else:
        rows = [parsed]

    if not rows:
        return {
            "format": "json",
            "schema_valid": False,
            "null_rate_bps": 10000,
            "duplicate_rate_bps": 0,
            "row_count": 0,
            "column_count": 0,
        }

    columns: set[str] = set()
    total_cells = 0
    null_cells = 0
    seen: dict[str, int] = {}
    duplicates = 0
    for row in rows:
        if isinstance(row, dict):
            for k, v in row.items():
                columns.add(str(k))
                total_cells += 1
                if v is None or v == "" or v == []:
                    null_cells += 1
            key = json.dumps(row, sort_keys=True, separators=(",", ":"))
        else:
            key = str(row)
            total_cells += 1
            if not row:
                null_cells += 1
        seen[key] = seen.get(key, 0) + 1
        if seen[key] == 2:
            duplicates += 1

    row_count = len(rows)
    return {
        "format": "json",
        "schema_valid": len(columns) > 0 or all(not isinstance(r, dict) for r in rows),
        "null_rate_bps": _rate_bps(null_cells, total_cells),
        "duplicate_rate_bps": _rate_bps(duplicates, row_count),
        "row_count": row_count,
        "column_count": len(columns),
    }


def _analyze_csv(sample: str) -> dict:
    lines = [ln for ln in sample.splitlines() if ln.strip()]
    if not lines:
        return {
            "format": "csv",
            "schema_valid": False,
            "null_rate_bps": 10000,
            "duplicate_rate_bps": 0,
            "row_count": 0,
            "column_count": 0,
        }

    # Drop the last line since a truncated sample often has a partial row.
    if len(lines) > 2:
        lines = lines[:-1]

    header = _split_csv_row(lines[0])
    data_rows = [_split_csv_row(ln) for ln in lines[1:]]

    col_count = len(header)
    row_count = len(data_rows)
    total_cells = 0
    null_cells = 0
    schema_valid = col_count > 0
    seen: dict[str, int] = {}
    duplicates = 0
    for row in data_rows:
        if len(row) != col_count:
            schema_valid = False
        for cell in row:
            total_cells += 1
            if cell == "" or cell.lower() in ("null", "nan", "na", "none"):
                null_cells += 1
        key = ",".join(row)
        seen[key] = seen.get(key, 0) + 1
        if seen[key] == 2:
            duplicates += 1

    return {
        "format": "csv",
        "schema_valid": schema_valid,
        "null_rate_bps": _rate_bps(null_cells, total_cells),
        "duplicate_rate_bps": _rate_bps(duplicates, row_count),
        "row_count": row_count,
        "column_count": col_count,
    }


def _split_csv_row(row: str) -> list:
    # Simple CSV splitter that respects double-quoted fields.  Good enough
    # for a bounded sample; we are not trying to be RFC-4180 compliant.
    fields: list[str] = []
    buf: list[str] = []
    in_quote = False
    i = 0
    while i < len(row):
        ch = row[i]
        if ch == '"':
            if in_quote and i + 1 < len(row) and row[i + 1] == '"':
                buf.append('"')
                i += 2
                continue
            in_quote = not in_quote
            i += 1
            continue
        if ch == "," and not in_quote:
            fields.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    fields.append("".join(buf).strip())
    return fields


def _build_prompt(
    url: str,
    schema_claim: str,
    intended_use: str,
    sample_text: str,
    structural: dict,
) -> str:
    return f"""You are a dataset quality auditor. You are shown a truncated
sample from a dataset that a provider claims is suitable for a specific use
case. Your job is to score the sample on five dimensions and return a
strict JSON response. Do not include any prose outside the JSON.

DATASET URL: {url}
CLAIMED SCHEMA: {schema_claim}
INTENDED USE: {intended_use}
STRUCTURAL SIGNALS (deterministic): {json.dumps(structural)}

SAMPLE (truncated, may end mid-record):
```
{sample_text[:3500]}
```

Score each dimension on an integer 0-10 scale:
  bias:          representativeness and demographic/temporal balance
  relevance:     fit for the intended use
  label_quality: labels are accurate, consistent, meaningful (if labels exist)
  diversity:     variety of examples and edge cases
  freshness:     temporal appropriateness for the claimed use

Return ONLY a JSON object with this exact shape:
{{
  "dimensions": {{
    "bias": 0-10,
    "relevance": 0-10,
    "label_quality": 0-10,
    "diversity": 0-10,
    "freshness": 0-10
  }},
  "analysis": "one short paragraph, <= 800 chars",
  "concerns": ["short concern strings", "up to 6"]
}}
"""


def _parse_llm_output(raw: typing.Any) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, (bytes, bytearray)):
        try:
            raw = raw.decode("utf-8", errors="replace")
        except Exception:
            raw = ""
    if not isinstance(raw, str):
        raise gl.vm.UserError(f"{ERROR_LLM} unexpected LLM response type")
    text = raw.strip()
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise gl.vm.UserError(f"{ERROR_LLM} no JSON object in LLM output")
    text = text[first:last + 1]
    # Strip trailing commas before closing brackets, a common LLM defect.
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    try:
        return json.loads(text)
    except Exception:
        raise gl.vm.UserError(f"{ERROR_LLM} could not parse LLM JSON")
