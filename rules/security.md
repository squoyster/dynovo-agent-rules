# rules/security.md

Purpose: make authentication, authorization, error disclosure, and policy
composition requirements explicit at security-sensitive boundaries.

```axl
R[S001]: sensitive_action -> M authenticate(caller) ∧ M authorize(caller,operation,resource) ∧ M require(confirmation ∨ explicit_approved_policy).
R[S002]: external_error(err) -> M stable_error_envelope(err) ∧ M sanitize(err,credentials ∪ paths ∪ parser_details ∪ upstream_bodies) ∧ M test(non_disclosure(err)).
R[S003]: duplicate(security_policy_key) -> M choose(reject ∨ deterministic_documented_merge) ∧ F silent_overwrite.
```
