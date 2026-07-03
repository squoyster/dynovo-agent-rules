# rules/verification.md

Purpose: require semantic evidence for fixes and remediation work where passing
the repository's ordinary gates is not sufficient proof.

```axl
R[V001]: claim(fix(invariant)) -> M add(test(fails_on(pre_fix) ∧ passes_on(post_fix))) ∧ M assert(positive_path ∧ negative_path ∧ observable_contract).
R[V002]: claim(behavior(f)) -> M establish(trace(transitive_callees(f)) ∨ prove_by(test)) ∧ F infer_from(name ∨ comment ∨ interface_only).
R[V003]: remediation(Δ) -> M review(Δ ∧ direct_callees ∧ introduced_failure_paths) ∧ F accept(gates_only).
```
