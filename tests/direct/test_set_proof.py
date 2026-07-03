"""Direct-mode tests for the SetProof intelligent contract.

These tests exercise the deterministic business logic and the leader path of
the non-deterministic block using mocked web + LLM responses.  Validator
consensus is exercised in integration tests, not here.
"""

import json

import pytest

from tests.direct._samples import (
    BROKEN_LLM_RESPONSE,
    DIRTY_CSV,
    IRIS_CSV,
    JSON_SAMPLE,
    VALID_LLM_RESPONSE,
)


CONTRACT = "contracts/set_proof.py"

FEE_RECIPIENT_ARG = "0x0000000000000000000000000000000000000000"
FEE_BPS_ARG = 100


# ---------------------------------------------------------------------------
# Deployment + view methods
# ---------------------------------------------------------------------------


def test_deploys_with_defaults(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)

    cfg = contract.get_config()
    assert cfg["fee_bps"] == 100
    assert cfg["dimensions"] == [
        "bias",
        "relevance",
        "label_quality",
        "diversity",
        "freshness",
    ]
    assert cfg["tiers"][0] == "TIER_4_POOR"
    assert cfg["tiers"][-1] == "TIER_1_EXCELLENT"
    # Fee recipient defaults to the deployer when the zero address is passed.
    expected = (
        direct_alice.hex() if isinstance(direct_alice, (bytes, bytearray)) else str(direct_alice)
    )
    assert cfg["fee_recipient"].lower().lstrip("0x") == expected.lower().lstrip("0x")
    assert contract.count() == 0
    assert contract.get_certificate("sp_000000") == {}


def test_fee_bps_is_clamped(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, 9999)
    assert contract.get_config()["fee_bps"] == 1000


# ---------------------------------------------------------------------------
# Happy path: CSV dataset, valid LLM, high tier
# ---------------------------------------------------------------------------


def _mock_all(direct_vm, body: str, llm_response) -> None:
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": 200, "body": body})
    payload = (
        json.dumps(llm_response) if not isinstance(llm_response, str) else llm_response
    )
    direct_vm.mock_llm(r".*", payload)


def test_assess_iris_csv_reaches_tier_1(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)

    _mock_all(direct_vm, IRIS_CSV, VALID_LLM_RESPONSE)

    aid = contract.assess_dataset(
        "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv",
        "sepal_length,sepal_width,petal_length,petal_width,species",
        "supervised classification of iris species",
        4096,
    )
    assert aid == "sp_000000"
    assert contract.count() == 1

    cert = contract.get_certificate(aid)
    assert cert["assessment_id"] == aid
    assert cert["dataset_url"].endswith("iris.csv")
    sc = cert["scorecard"]
    assert sc["structural"]["format"] == "csv"
    assert sc["structural"]["schema_valid"] is True
    assert sc["structural"]["column_count"] == 5
    assert sc["structural"]["null_rate_bps"] == 0
    assert sc["dimensions"]["relevance"] == 9
    # Iris + strong LLM scores -> Tier 1.
    assert cert["tier"] == "TIER_1_EXCELLENT"
    assert sc["overall_score"] >= 78

    # verify_quality composability
    assert contract.verify_quality(aid, "TIER_3_ACCEPTABLE") is True
    assert contract.verify_quality(aid, "TIER_1_EXCELLENT") is True
    assert contract.verify_quality("sp_missing", "TIER_4_POOR") is False


def test_list_certificates_returns_newest_first(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)

    _mock_all(direct_vm, IRIS_CSV, VALID_LLM_RESPONSE)
    aid1 = contract.assess_dataset("https://example.com/a.csv", "s", "u")
    aid2 = contract.assess_dataset("https://example.com/b.csv", "s", "u")
    aid3 = contract.assess_dataset("https://example.com/c.csv", "s", "u")

    listing = contract.list_certificates(0, 10)
    assert [c["assessment_id"] for c in listing] == [aid3, aid2, aid1]

    page = contract.list_certificates(1, 1)
    assert len(page) == 1
    assert page[0]["assessment_id"] == aid2

    assert contract.get_latest_for_url("https://example.com/b.csv")["assessment_id"] == aid2


# ---------------------------------------------------------------------------
# Deterministic path errors
# ---------------------------------------------------------------------------


def test_rejects_non_http_urls(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    with direct_vm.expect_revert("dataset_url must be http"):
        contract.assess_dataset("ftp://not-allowed", "s", "u")


def test_rejects_oversize_schema(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    with direct_vm.expect_revert("schema_claim too long"):
        contract.assess_dataset("https://example.com", "x" * 2049, "u")


# ---------------------------------------------------------------------------
# Non-deterministic path errors (fetch and LLM misbehaviour)
# ---------------------------------------------------------------------------


def test_fetch_error_is_classified(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    direct_vm.mock_web(r".*", {"status": 503, "body": ""})
    with direct_vm.expect_revert("host returned 503"):
        contract.assess_dataset("https://example.com/x", "s", "u")


def test_empty_body_is_external(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    direct_vm.mock_web(r".*", {"status": 200, "body": ""})
    with direct_vm.expect_revert("empty response body"):
        contract.assess_dataset("https://example.com/x", "s", "u")


def test_llm_junk_is_flagged(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    _mock_all(direct_vm, IRIS_CSV, BROKEN_LLM_RESPONSE)
    with direct_vm.expect_revert("no JSON object in LLM output"):
        contract.assess_dataset("https://example.com/x", "s", "u")


# ---------------------------------------------------------------------------
# Structural analysis of imperfect data
# ---------------------------------------------------------------------------


def test_dirty_csv_lowers_score_and_tier(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    # LLM says the dataset is great even though it obviously is not.
    _mock_all(direct_vm, DIRTY_CSV, VALID_LLM_RESPONSE)
    aid = contract.assess_dataset("https://example.com/dirty.csv", "id,label,value", "test")

    cert = contract.get_certificate(aid)
    sc = cert["scorecard"]
    assert sc["structural"]["schema_valid"] is False
    # Structural penalties clamp the score even when the LLM is enthusiastic.
    assert sc["overall_score"] <= 55
    assert cert["tier"] in ("TIER_3_ACCEPTABLE", "TIER_4_POOR")


def test_json_sample_is_parsed(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    _mock_all(direct_vm, JSON_SAMPLE, VALID_LLM_RESPONSE)
    aid = contract.assess_dataset("https://example.com/j.json", "id,text,label", "nlp")
    struct = contract.get_certificate(aid)["scorecard"]["structural"]
    assert struct["format"] == "json"
    assert struct["row_count"] == 4
    # Two nulls (empty text + null label) out of 12 cells = ~1666 bps.
    assert 1000 <= struct["null_rate_bps"] <= 2500


# ---------------------------------------------------------------------------
# Access control-ish: verify_quality returns False for unknown ids and tiers
# ---------------------------------------------------------------------------


def test_verify_quality_rejects_unknown_tier(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT, FEE_RECIPIENT_ARG, FEE_BPS_ARG)
    _mock_all(direct_vm, IRIS_CSV, VALID_LLM_RESPONSE)
    aid = contract.assess_dataset("https://example.com/a.csv", "s", "u")
    assert contract.verify_quality(aid, "BOGUS") is False
