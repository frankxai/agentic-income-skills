import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMA_PATH = join(__dirname, "..", "schemas", "income-system.v1.schema.json");

let cachedSchema: any = null;
export function getIncomeSystemSchema(): any {
  if (!cachedSchema) {
    cachedSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  }
  return cachedSchema;
}

export interface ValidationError {
  path: string;
  code: "schema" | "secret-field" | "policy";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface IncomeSystemManifest {
  apiVersion: string;
  kind: "IncomeSystem";
  metadata: {
    name: string;
    version?: string;
    owner?: string;
    description?: string;
  };
  spec: {
    principal: {
      type: "human" | "organization";
      contactEmail: string;
      verifiedDomain?: string;
    };
    agent: {
      name: string;
      harness: string;
      model?: string;
      capabilities: string[];
    };
    authority: {
      deniedActions: string[];
      approvalRequiredActions?: string[];
      maxDailyBudgetUsd: number;
      maxPerRunBudgetUsd: number;
    };
    monetization: {
      offers?: Array<{
        id: string;
        name: string;
        type: "affiliate" | "saas" | "service" | "course";
        destinationUrl: string;
        rate: string;
        disclosureRequired: boolean;
      }>;
      disclosurePolicy: {
        required: boolean;
        statement: string;
        placement: "prominent-top" | "inline" | "footer";
      };
    };
  };
}

const requiredDeniedActions = [
  "sign-contract",
  "change-price",
  "transfer-funds",
  "increase-budget"
];

const forbiddenSecretKey = /^(api[-_]?key|bank[-_]?password|mnemonic|password|private[-_]?key|seed[-_]?phrase)$/i;

function findForbiddenSecrets(value: any, path = ""): ValidationError[] {
  if (!value || typeof value !== "object") return [];

  const errors: ValidationError[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = path + "/" + key;
    if (forbiddenSecretKey.test(key)) {
      errors.push({
        path: childPath,
        code: "secret-field",
        message: "Secret-bearing fields are forbidden in an IncomeSystem manifest"
      });
    }
    errors.push(...findForbiddenSecrets(child, childPath));
  }
  return errors;
}

function policyErrors(document: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const authority = document?.spec?.authority;
  const principal = document?.spec?.principal;

  if (authority && typeof authority === "object") {
    const deniedActions = Array.isArray(authority.deniedActions) ? authority.deniedActions : [];
    for (const action of requiredDeniedActions) {
      if (!deniedActions.includes(action)) {
        errors.push({
          path: "/spec/authority/deniedActions",
          code: "policy",
          message: `Required denied action '${action}' is missing`
        });
      }
    }

    if (
      typeof authority.maxPerRunBudgetUsd === "number" &&
      typeof authority.maxDailyBudgetUsd === "number" &&
      authority.maxPerRunBudgetUsd > authority.maxDailyBudgetUsd
    ) {
      errors.push({
        path: "/spec/authority/maxPerRunBudgetUsd",
        code: "policy",
        message: "maxPerRunBudgetUsd cannot exceed maxDailyBudgetUsd"
      });
    }
  }

  if (principal && typeof principal === "object") {
    const contactEmail = principal.contactEmail;
    const verifiedDomain = principal.verifiedDomain;
    if (contactEmail && verifiedDomain) {
      const emailDomain = contactEmail.split("@")[1];
      if (emailDomain && emailDomain.toLowerCase() !== verifiedDomain.toLowerCase()) {
        errors.push({
          path: "/spec/principal/contactEmail",
          code: "policy",
          message: `Principal contact email domain '${emailDomain}' must match verified domain '${verifiedDomain}'`
        });
      }
    }
  }

  return errors;
}

let compiledValidator: any = null;
function getValidator() {
  if (!compiledValidator) {
    const ajv = new (Ajv2020 as any)({
      allErrors: true,
      strict: false
    });
    (addFormats as any)(ajv);
    compiledValidator = ajv.compile(getIncomeSystemSchema());
  }
  return compiledValidator;
}

export function validateIncomeSystem(document: any): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = getValidator();
  const validSchema = validator(document);

  if (!validSchema && validator.errors) {
    for (const err of validator.errors) {
      errors.push({
        path: err.instancePath || "/",
        code: "schema",
        message: err.message || "Schema validation failed"
      });
    }
  }

  errors.push(...findForbiddenSecrets(document));
  errors.push(...policyErrors(document));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function verifyDisclosure(text: string, policy?: { statement?: string; required?: boolean }): {
  compliant: boolean;
  score: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let score = 100;

  if (policy && policy.required === false) {
    return { compliant: true, score: 100, warnings: [] };
  }

  const lower = text.toLowerCase();
  const hasAffiliateMention = lower.includes("affiliate") || lower.includes("commission") || lower.includes("partner");
  const hasNoExtraCostMention = lower.includes("no extra cost") || lower.includes("at no additional cost") || lower.includes("free to you");
  const hasHonestRecommendation = lower.includes("recommend") || lower.includes("test") || lower.includes("use");

  if (!hasAffiliateMention) {
    warnings.push("Missing clear mention of affiliate relationship or commission.");
    score -= 50;
  }
  if (!hasNoExtraCostMention) {
    warnings.push("Recommended to clarify that commissions incur no extra cost to the buyer.");
    score -= 20;
  }
  if (!hasHonestRecommendation) {
    warnings.push("Recommended to disclose genuine evaluation/usage of recommended tools.");
    score -= 10;
  }

  return {
    compliant: score >= 70,
    score,
    warnings
  };
}
