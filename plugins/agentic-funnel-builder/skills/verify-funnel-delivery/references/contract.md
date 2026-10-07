# Release contract

| Boundary | Evidence |
|---|---|
| Promise → product | Material claims map to tested capabilities or authorized scope |
| Catalog → checkout | SKU, price, currency, taxes, renewal, terms and availability agree |
| Payment → access | Signed test event grants correct access once; replay/order tested |
| Delivery → usefulness | Fresh user executes the promised task with shipped version |
| Support → recovery | Failed entitlement/access has a tested recovery path and owner |
| Experiment → rollout | Audience, primary metric, duration, sample rule, rollback |

A URL or evidence-level label is not proof. Review the underlying source. Never connect an advisory readiness flag directly to publication.

Production authorization must bind principal, tenant, digest, action, environment, expiry and budget with replay-safe server-side consumption. The local v0.1 planner has no production adapter or authority verifier and always reports production authorization as false.
