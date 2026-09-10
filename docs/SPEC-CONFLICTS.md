# SPEC diagnostic stop

Status: `NEEDS_DECISION`  
Base: `ddc81034add54bf47bf63b5a11e48ed1bd64d4d9`  
Scope: MVP-0 middleware and the contracts it composes

This report records one direct procedural conflict and the adjacent contract gaps discovered while auditing the current implementation. It does not change the specification or select a resolution.

## Direct conflict: proposal, preflight, and reservation commit order

The central invariant requires every executed action to have an approved, durable intent before execution (`SPEC.md`, “Cel i granica systemu”). R.4 requires `FailureGate.preflight()` to create its reservation and persist the `ALLOW` `guard_decision` atomically before returning. R.5, however, orders the pipeline as:

1. compute the input state and preconditions;
2. call `preflight`;
3. commit intent and reservation;
4. spawn only after permit verification.

The reservation cannot both be committed inside `preflight()` and be committed as a later R.5 step. R.5 also requires the final receipt to contain a durable `proposal_id`, but does not say whether a blocked proposal must already have a `tool_proposal` event.

Affected contract:

- `FailureGate.preflight()` and ADR-015 atomicity;
- the pre-spawn intent invariant;
- `tool_proposal` and `guard_decision` ordering;
- reservation and permit lifecycle;
- `proposal_id` in the R.5 receipt.

Acceptance cases that cannot be implemented unambiguously:

- `Third identical failure` and `Concurrent duplicate`: whether every BLOCK has a preceding durable proposal;
- `Crash after intent`: whether “intent” means `tool_proposal`, reservation, or `ALLOW`;
- crash injection between intent, reservation, decision, and spawn.

Decision options:

1. Persist `tool_proposal` before `preflight`; keep reservation and `ALLOW` atomic inside `preflight`; remove the later duplicate reservation commit from the R.5 sequence.
2. Make `preflight` a pure decision and commit proposal, reservation, and `ALLOW` later in one operation. This changes ADR-015/R.4 and the current public contract.
3. Define the R.5 “commit intent and reservation” step as a description of effects already completed by `preflight`, while separately fixing the required order and payload of `tool_proposal` for ALLOW and BLOCK.

No middleware ordering change should be implemented until one option is accepted in `SPEC.md`.

## Contract decisions needed by later remediation

These are not all logical contradictions, but the current public API or persistence model does not determine a single implementation.

| Contract seam | Missing decision | Acceptance affected |
|---|---|---|
| Receipt identity | ADR-010 says identifiers separate in R.5; ADR-016 defines an in-memory wrapper and forbids a new event kind. Define the event, payload, commit point, and reopen semantics, or retain `receipt_id === raw_event_id` explicitly. | Missing blob; zero false-success receipts |
| State revalidation | Define who persists contradiction/freshness evidence while standalone `revalidateMemory()` remains pure, and how an epoch retains measurement capability after reopen. | File mutation staleness; reopen |
| Gate projections | Define authoritative event payloads, reducer/version, rebuild trigger, and reconciliation for failures, reservation states, and consumed proofs. | Restart gate; replayed proof; reopen storage |
| Worktree lease | Define owner, reentrancy, lifetime from input measurement through output measurement, expiry/recovery, and fencing validation. | Concurrent duplicate; broker crash |
| Digest epochs | Define whether `tested_epoch` and `compiled_epoch` equal the request-specific precondition epoch, full world epoch, or another execution-input fingerprint. | Adapter digests; test-result self-invalidation |
| Event parents | Define how non-empty `parent_event_ids` enter `append`, persist, and participate in `event_hash`, or remove the field from MVP-0. | Reopen durability; receipt lineage |
| UNKNOWN reconciliation | Define pre-spawn rejection separately from post-spawn uncertainty, the reconciliation authority/API, event payloads, and reservation transitions. | Crash after intent; zero retry after UNKNOWN |
| Escape proof composition | Define how an opaque proof reaches middleware `intercept()` without exposing the signing key, or explicitly keep proofs outside R.5 MVP-0. | Escape proof; replayed proof; E2E |

## Implementation findings held behind this stop

The current implementation has independently evidenced defects in permit-to-request binding, UNKNOWN classification, shared raw limits, child termination, whole-output buffering, epoch provenance, lease coverage, projection rebuild, bounded lookup, fixture provenance, chaos tests, and CI gating. Those defects should be repaired in the frozen module order after the relevant decisions above are incorporated into the normative specification.

No tests were run for this documentation-only diagnostic. Reading tests and source code is not a passing test result.
