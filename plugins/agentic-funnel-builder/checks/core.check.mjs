import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProduct,reviewReadiness,compileBlueprint,modelEconomics,evaluateExperiment} from '../src/core.mjs';
const example=()=>JSON.parse(readFileSync(new URL('../examples/product-contract.json',import.meta.url)));
function reviewedFixture(){
 const c=example();c.product.status='tested';c.offer.priceStatus='approved';c.offer.termsRef='https://example.com/terms';c.offer.refundPolicyRef='https://example.com/refunds';c.delivery={payment:'sandbox-tested',fulfillment:'sandbox-tested',supportRef:'https://example.com/support'};
 c.evidence=[{id:'review-record',summary:'Test fixture only',sourceRef:'fixture://review',observedAt:new Date().toISOString(),level:'document-reviewed',synthetic:false}];
 c.evaluations=c.product.acceptance.map(x=>({criterionId:x.id,result:'pass',evidenceRef:'review-record',artifactVersion:c.product.artifactVersion}));return c;
}
test('unfinished product yields waitlist and delivery blockers',()=>{
 const c=example();assert.equal(validateProduct(c).valid,true);const b=compileBlueprint(c);assert.equal(b.recommendedCta,'waitlist');assert.ok(b.launchReview.blockers.some(x=>x.includes('Fulfillment')));assert.equal(b.launchReview.productionAuthorized,false);
});
test('missing references, duplicate IDs and unexpected fields reject',()=>{
 const c=example();c.claims=[{id:'claim-one',text:'Unsupported',evidenceRefs:['missing-evidence'],approval:'approved'}];assert.equal(validateProduct(c).valid,false);
 c.claims=[];c.evidence.push({...c.evidence[0]});assert.equal(validateProduct(c).valid,false);const d=example();d.approved=true;assert.equal(validateProduct(d).valid,false);
});
test('synthetic, stale, future and old-version evals cannot satisfy readiness',()=>{
 for(const alter of [c=>c.evidence[0].synthetic=true,c=>c.evidence[0].observedAt='2020-01-01T00:00:00Z',c=>c.evidence[0].observedAt='2099-01-01T00:00:00Z',c=>c.evaluations[0].artifactVersion='old']){
 const c=reviewedFixture();alter(c);assert.equal(reviewReadiness(c).advisoryStatus,'needs-repair');}
});
test('caller-reported readiness never authorizes production',()=>{
 const r=reviewReadiness(reviewedFixture());assert.equal(r.advisoryStatus,'ready-for-evidence-review');assert.equal(r.productionAuthorized,false);assert.match(r.evidenceTrust,/not verified/);assert.match(r.contractDigest,/^sha256:[a-f0-9]{64}$/);
});
test('claims require approval and supporting evidence',()=>{
 const c=reviewedFixture();c.claims=[{id:'claim-one',text:'Demonstrated claim',evidenceRefs:['review-record'],approval:'pending'}];assert.equal(reviewReadiness(c).advisoryStatus,'needs-repair');c.claims[0].approval='approved';assert.equal(reviewReadiness(c).advisoryStatus,'ready-for-evidence-review');c.evidence[0].level='hypothesis';assert.equal(reviewReadiness(c).advisoryStatus,'needs-repair');
});
test('economics includes refunds, fees, labor, acquisition and overhead',()=>{
 const r=modelEconomics({netPriceMinor:10000,currency:'EUR',refundRate:.1,feeRate:.05,feeFixedMinor:50,variableCostMinor:500,supportMinutes:30,hourlyLaborMinor:6000,acquisitionCostMinor:1000,monthlyFixedCostMinor:10000,monthlyOrders:10});
 assert.equal(r.perOrder.contributionAfterAcquisitionMinor,3950);assert.equal(r.monthlyContributionAfterFixedMinor,29500);assert.equal(r.breakEvenOrders,3);
});
test('negative contribution has no feasible breakeven; invalid amounts reject',()=>{
 const c={netPriceMinor:100,currency:'EUR',refundRate:0,feeRate:0,feeFixedMinor:0,variableCostMinor:200,supportMinutes:0,hourlyLaborMinor:0,acquisitionCostMinor:0,monthlyFixedCostMinor:1000,monthlyOrders:1};assert.equal(modelEconomics(c).breakEvenOrders,null);assert.equal(modelEconomics(c).breakEvenAcquisitionCostMinor,null);c.refundRate=2;assert.throws(()=>modelEconomics(c));
});
test('sparse, unfinished and impossible experiments cannot declare a winner',()=>{
 const x={control:{eligible:10,activated:1},variant:{eligible:10,activated:5},plannedPerArm:1000,fixedHorizonComplete:false,minimumUsefulLift:.01,qualityGuardrailsPassed:true};const r=evaluateExperiment(x);assert.equal(r.decision,'continue-to-planned-horizon');assert.equal(r.approximate95PercentInterval,null);assert.equal(r.rolloutAuthorized,false);x.variant.activated=11;assert.throws(()=>evaluateExperiment(x));
});
test('fixed-horizon result is only a review candidate and quality dominates',()=>{
 const x={control:{eligible:10000,activated:1000},variant:{eligible:10000,activated:2000},plannedPerArm:10000,fixedHorizonComplete:true,minimumUsefulLift:.02,qualityGuardrailsPassed:true};assert.equal(evaluateExperiment(x).decision,'candidate-for-review');x.qualityGuardrailsPassed=false;assert.equal(evaluateExperiment(x).decision,'repair-quality');
});
