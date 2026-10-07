import { z } from 'zod';
import { createHash } from 'node:crypto';
const str=z.string().trim().min(1).max(3000);
const id=z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/);
const money=z.number().int().min(0).max(1e12);
const Evidence=z.object({id,summary:str,sourceRef:str,observedAt:z.string().datetime(),level:z.enum(['hypothesis','reported','document-reviewed','connector-observed','independently-attested']),synthetic:z.boolean()}).strict();
export const ProductContract=z.object({
 schemaVersion:z.literal('afb/v0.1'),id,owner:str,
 basis:z.object({kind:z.enum(['IncomeSystem','IncomeAsset','standalone']),ref:str}).strict(),
 buyer:z.object({segment:str,job:str,currentAlternative:str}).strict(),
 product:z.object({kind:z.enum(['research','digital-product','software','skill-pack','agent-service']),name:str,promise:str,artifactVersion:str,artifactRefs:z.array(str).min(1).max(30),status:z.enum(['concept','prototype','tested']),acceptance:z.array(z.object({id,description:str,grader:z.enum(['deterministic','model','human']),required:z.boolean()}).strict()).min(1).max(30)}).strict(),
 evidence:z.array(Evidence).max(100),
 claims:z.array(z.object({id,text:str,evidenceRefs:z.array(id).min(1).max(20),approval:z.enum(['pending','approved'])}).strict()).max(30),
 offer:z.object({priceMinor:money,currency:z.string().regex(/^[A-Z]{3}$/),priceStatus:z.enum(['proposed','approved']),includes:z.array(str).min(1).max(20),exclusions:z.array(str).max(20),termsRef:str.nullable(),refundPolicyRef:str.nullable()}).strict(),
 delivery:z.object({payment:z.enum(['unconfigured','sandbox-tested','live-tested']),fulfillment:z.enum(['unconfigured','sandbox-tested','live-tested']),supportRef:str.nullable()}).strict(),
 evaluations:z.array(z.object({criterionId:id,result:z.enum(['pass','fail','not-run']),evidenceRef:id.nullable(),artifactVersion:str}).strict()).max(30),
 funnel:z.object({kind:z.enum(['diagnostic','demo','workshop','direct']),primaryCta:z.enum(['waitlist','buy','request-scope']),channel:str}).strict(),
 authority:z.object({publish:z.literal('review-required'),broadcast:z.literal('review-required'),maxRunCostMinor:money}).strict()
}).strict().superRefine((c,ctx)=>{
 const err=message=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 for(const [label,items] of [['evidence',c.evidence],['claim',c.claims],['criterion',c.product.acceptance]]) if(new Set(items.map(x=>x.id)).size!==items.length)err('Duplicate '+label+' IDs');
 const eids=new Set(c.evidence.map(x=>x.id)),aids=new Set(c.product.acceptance.map(x=>x.id));
 for(const claim of c.claims)for(const ref of claim.evidenceRefs)if(!eids.has(ref))err('Missing claim evidence '+ref);
 if(new Set(c.evaluations.map(x=>x.criterionId)).size!==c.evaluations.length)err('Duplicate criterion evaluation');
 for(const e of c.evaluations){if(!aids.has(e.criterionId))err('Unknown criterion '+e.criterionId);if(e.evidenceRef&&!eids.has(e.evidenceRef))err('Missing evaluation evidence '+e.evidenceRef);}
 if(!c.product.acceptance.some(x=>x.required))err('At least one required acceptance criterion is needed');
});
export function validateProduct(raw){
 const r=ProductContract.safeParse(raw);
 return r.success?{valid:true,schemaVersion:r.data.schemaVersion,evidenceTrust:'caller-supplied; not independently verified'}:{valid:false,errors:r.error.issues.map(x=>({path:x.path.join('.'),message:x.message}))};
}
export function reviewReadiness(raw,now=Date.now()){
 const c=ProductContract.parse(raw),blockers=[];
 const strong=e=>e&&!e.synthetic&&['document-reviewed','connector-observed','independently-attested'].includes(e.level)&&Date.parse(e.observedAt)<=now&&now-Date.parse(e.observedAt)<=90*86400000;
 const byId=new Map(c.evidence.map(x=>[x.id,x]));
 if(c.product.status!=='tested')blockers.push('Product has not reached tested state');
 if(c.offer.priceStatus!=='approved')blockers.push('Commercial price is still proposed');
 if(!c.offer.termsRef||!c.offer.refundPolicyRef)blockers.push('Terms and refund policy references are required');
 if(!c.delivery.supportRef)blockers.push('Support and recovery route is missing');
 if(c.offer.priceMinor>0&&c.delivery.payment==='unconfigured')blockers.push('Payment path has not been tested');
 if(c.delivery.fulfillment==='unconfigured')blockers.push('Fulfillment path has not been tested');
 for(const criterion of c.product.acceptance.filter(x=>x.required)){
  const e=c.evaluations.find(x=>x.criterionId===criterion.id);
  if(!e||e.result!=='pass'||e.artifactVersion!==c.product.artifactVersion||!strong(byId.get(e.evidenceRef)))blockers.push('Acceptance '+criterion.id+' needs current-version, passing, non-synthetic evidence from the last 90 days');
 }
 for(const claim of c.claims)if(claim.approval!=='approved'||!claim.evidenceRefs.every(ref=>strong(byId.get(ref))))blockers.push('Claim '+claim.id+' needs approval and current non-synthetic evidence');
 return {productId:c.id,contractDigest:'sha256:'+createHash('sha256').update(JSON.stringify(c)).digest('hex'),advisoryStatus:blockers.length?'needs-repair':'ready-for-evidence-review',blockers,productionAuthorized:false,evidenceTrust:'caller-supplied; source contents, approval identity and account state are not verified',requiredExternalChecks:['Review evidence against every material promise, including product.promise and offer contents','Verify principal, tenant, exact artifact and release authority','Confirm account permissions, live checkout and delivery configuration'],policyVersion:'afb-advisory/0.1; 90-day evidence freshness'};
}
export function compileBlueprint(raw){
 const c=ProductContract.parse(raw),review=reviewReadiness(c);
 const purpose={diagnostic:'Complete one useful diagnostic',demo:'Run a representative product task',workshop:'Complete one guided practical task',direct:'Inspect the deliverable and fit'}[c.funnel.kind];
 const blocked=c.funnel.primaryCta==='buy'&&review.blockers.length>0;
 return {schemaVersion:'afb-blueprint/v0.1',productId:c.id,status:'draft',requestedCta:c.funnel.primaryCta,recommendedCta:blocked?'waitlist':c.funnel.primaryCta,ctaReason:blocked?'Unresolved readiness checks prevent recommending paid checkout':'Proposed journey; evidence and publication authority still require review',
 pages:[{id:'entry',purpose,channel:c.funnel.channel,sections:['Buyer job','Useful sample','Mechanism','Evidence and limits','One next action']},{id:'offer',purpose:'Inspect scope, contents, terms and fit',sections:['Included deliverables','Excluded work','Price and availability','Delivery and support','Evidence-linked claims']},{id:'activation',purpose:c.product.acceptance.find(x=>x.required).description,sections:['Access artifact','Complete first task','Request help','Record useful outcome']}],
 events:['qualified_intent','checkout_started','payment_confirmed','entitlement_granted','first_value','outcome_accepted','refund_recorded'],qualityMetrics:['time_to_first_value','acceptance_rate','support_minutes','contribution_after_acquisition'],launchReview:review,sideEffects:'none'};
}
export const EconomicsInput=z.object({netPriceMinor:money,currency:z.string().regex(/^[A-Z]{3}$/),refundRate:z.number().min(0).max(1),feeRate:z.number().min(0).max(1),feeFixedMinor:money,variableCostMinor:money,supportMinutes:z.number().min(0).max(100000),hourlyLaborMinor:money,acquisitionCostMinor:money,monthlyFixedCostMinor:money,monthlyOrders:z.number().int().min(0).max(1e9)}).strict();
export function modelEconomics(raw){
 const c=EconomicsInput.parse(raw),round=Math.round;
 const revenue=c.netPriceMinor*(1-c.refundRate),fees=c.netPriceMinor*c.feeRate+c.feeFixedMinor,labor=c.supportMinutes*c.hourlyLaborMinor/60;
 const before=revenue-fees-c.variableCostMinor-labor,after=before-c.acquisitionCostMinor;
 return {basis:'illustrative scenario; not observed revenue or a forecast',currency:c.currency,assumptions:['Price is net of indirect tax','Fees conservatively remain on refunded orders','Variable costs and support incurred per order','Fixed overhead separate from unit contribution','Development investment and income tax excluded'],perOrder:{expectedRevenueMinor:round(revenue),feesMinor:round(fees),laborMinor:round(labor),contributionBeforeAcquisitionMinor:round(before),contributionAfterAcquisitionMinor:round(after)},breakEvenAcquisitionCostMinor:before>=0?round(before):null,monthlyContributionAfterFixedMinor:round(after*c.monthlyOrders-c.monthlyFixedCostMinor),breakEvenOrders:after>0?Math.ceil(c.monthlyFixedCostMinor/after):null};
}
export const ExperimentInput=z.object({control:z.object({eligible:z.number().int().min(0).max(1e9),activated:z.number().int().min(0).max(1e9)}).strict(),variant:z.object({eligible:z.number().int().min(0).max(1e9),activated:z.number().int().min(0).max(1e9)}).strict(),plannedPerArm:z.number().int().min(1).max(1e9),fixedHorizonComplete:z.boolean(),minimumUsefulLift:z.number().min(0).max(1),qualityGuardrailsPassed:z.boolean()}).strict().superRefine((c,ctx)=>{for(const key of ['control','variant'])if(c[key].activated>c[key].eligible)ctx.addIssue({code:z.ZodIssueCode.custom,message:key+': activated exceeds eligible'});});
export function evaluateExperiment(raw){
 const c=ExperimentInput.parse(raw);
 if(!c.control.eligible||!c.variant.eligible)return {decision:'insufficient-data',reason:'Both denominators must be positive',rolloutAuthorized:false};
 const a=c.control.activated/c.control.eligible,b=c.variant.activated/c.variant.eligible;
 const reliable=[c.control,c.variant].every(x=>x.activated>=10&&x.eligible-x.activated>=10);
 const delta=b-a,se=Math.sqrt(a*(1-a)/c.control.eligible+b*(1-b)/c.variant.eligible),interval=reliable?[delta-1.96*se,delta+1.96*se]:null;
 const enough=c.control.eligible>=c.plannedPerArm&&c.variant.eligible>=c.plannedPerArm&&c.fixedHorizonComplete,candidate=enough&&reliable&&c.qualityGuardrailsPassed&&interval[0]>c.minimumUsefulLift;
 return {decision:!c.qualityGuardrailsPassed?'repair-quality':candidate?'candidate-for-review':!enough?'continue-to-planned-horizon':'inconclusive',controlRate:a,variantRate:b,absoluteLift:delta,approximate95PercentInterval:interval,method:'unadjusted normal approximation; independent randomized users assumed; invalid for repeated peeking or multiple-comparison selection',rolloutAuthorized:false};
}
