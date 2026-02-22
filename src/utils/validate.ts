import { z } from 'zod';

// ---------------------------------------------------------------------------
// Env config (parsed once, used by rules)
// ---------------------------------------------------------------------------

const listActionSchema = z.enum(['REVIEW', 'BLOCK']);

const envConfigSchema = z.object({
  WHITELIST_REQUIRED: z
    .string()
    .optional()
    .transform((s) => s === 'true' || s === '1'),
  WHITELIST_NON_LISTED_ACTION: listActionSchema.optional().default('REVIEW'),
  THRESHOLD_ACTION: listActionSchema.optional().default('REVIEW'),
}).strict();

function parseThresholdsFromEnv(env: NodeJS.ProcessEnv): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(env)) {
    if (key.startsWith('THRESHOLD_') && key !== 'THRESHOLD_ACTION') {
      const currency = key.slice('THRESHOLD_'.length);
      const v = env[key];
      if (v != null && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n) && n >= 0) out[currency] = n;
      }
    }
  }
  return out;
}

export type EnvConfig = {
  whitelistRequired: boolean;
  whitelistNonListedAction: 'REVIEW' | 'BLOCK';
  thresholdAction: 'REVIEW' | 'BLOCK';
  thresholdByCurrency: Record<string, number>;
};

let cachedConfig: EnvConfig | null = null;

export function getConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  if (cachedConfig != null) return cachedConfig;
  const parsed = envConfigSchema.parse({
    WHITELIST_REQUIRED: env.WHITELIST_REQUIRED,
    WHITELIST_NON_LISTED_ACTION: env.WHITELIST_NON_LISTED_ACTION,
    THRESHOLD_ACTION: env.THRESHOLD_ACTION,
  });
  cachedConfig = {
    whitelistRequired: parsed.WHITELIST_REQUIRED ?? false,
    whitelistNonListedAction: parsed.WHITELIST_NON_LISTED_ACTION,
    thresholdAction: parsed.THRESHOLD_ACTION,
    thresholdByCurrency: parseThresholdsFromEnv(env),
  };
  return cachedConfig;
}

// ---------------------------------------------------------------------------
// Precheck body
// ---------------------------------------------------------------------------

const counterpartySchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  country: z.string().optional(),
  wallet: z.string().optional(),
  bankAccount: z.string().optional(),
});

const amountSchema = z.object({
  value: z.number().nonnegative(),
  currency: z.string().length(3),
});

const corridorSchema = z.object({
  fromCountry: z.string(),
  toCountry: z.string(),
});

const metadataSchema = z.object({
  purpose: z.string().optional(),
  reference: z.string().optional(),
});

export const precheckBodySchema = z.object({
  sender: counterpartySchema,
  receiver: counterpartySchema,
  amount: amountSchema,
  corridor: corridorSchema,
  metadata: metadataSchema.optional(),
});

export type CounterpartyInput = z.infer<typeof counterpartySchema>;
export type AmountInput = z.infer<typeof amountSchema>;
export type CorridorInput = z.infer<typeof corridorSchema>;
export type MetadataInput = z.infer<typeof metadataSchema>;
export type PrecheckBody = z.infer<typeof precheckBodySchema>;

// ---------------------------------------------------------------------------
// List entry (POST body + query)
// ---------------------------------------------------------------------------

export const listTypeSchema = z.enum(['BLACKLIST', 'WHITELIST']);
export type ListTypeApi = z.infer<typeof listTypeSchema>;

export const createListEntryBodySchema = z.object({
  type: listTypeSchema,
  counterpartyId: z.string().uuid(),
  reason: z.string().optional(),
  scope: z.string().optional(),
});
export type CreateListEntryBody = z.infer<typeof createListEntryBodySchema>;

export const listEntriesQuerySchema = z.object({
  type: listTypeSchema.optional(),
});
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
