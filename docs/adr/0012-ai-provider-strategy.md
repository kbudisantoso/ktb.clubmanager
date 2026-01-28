# 12. AI/LLM Provider Strategy

Date: 2026-01-26

## Status

Accepted

## Context

ktb.clubmanager requires AI capabilities for:

1. **Receipt Recognition (OCR):** Extract data from uploaded receipts/invoices
2. **Transaction Categorization:** Suggest SKR42 accounts for bank imports
3. **Text Extraction:** Parse payment references for member matching

These are post-MVP features but infrastructure decisions affect earlier phases (storage for receipts, data model for AI metadata).

### EU Compliance Requirements

German Vereine handle member personal data (names, addresses, bank details) under DSGVO/GDPR. AI features processing this data must comply with EU data residency requirements:

- Data should not leave EU/EEA during processing
- Provider must have EU data processing agreements
- Ideally, processing occurs in EU data centers

### Provider Evaluation

| Provider | EU Data Center | Vision/OCR | Text/Completion | Cost | Notes |
|----------|---------------|------------|-----------------|------|-------|
| **OpenAI** | ❌ (EU residency requires enterprise agreement) | ✓ GPT-4V | ✓ GPT-4o | $$ | EU residency practically unavailable for small/mid companies |
| **Vertex AI Gemini** | ✓ europe-west4 (Netherlands) | ✓ Gemini Pro Vision | ✓ Gemini Pro | $$ | Google Cloud EU region, strong vision capabilities |
| **Mistral AI** | ✓ EU-native (France) | ❌ | ✓ Mistral Large | $ | Paris-based company, excellent for text |
| **Azure OpenAI** | ✓ West Europe | ✓ GPT-4V | ✓ GPT-4o | $$$ | Enterprise pricing, requires Azure commitment |
| **Anthropic Claude** | ❌ | ❌ | ✓ Claude 3 | $$ | No EU region, no vision |

### OpenAI EU Data Residency Reality

OpenAI officially offers EU data residency for eligible customers. However, in practice:

- Requires enterprise agreement negotiation
- Small and medium companies are typically declined or ignored
- Sales process favors large enterprise customers
- GA endpoints (US-based) are the practical default

This makes OpenAI unsuitable as primary provider for EU compliance.

## Decision

We will implement a **tiered AI provider strategy** with EU-first selection:

### Primary Providers (EU-compliant)

1. **Vision/OCR Tasks:** Vertex AI Gemini Pro Vision
   - Region: `europe-west4` (Netherlands)
   - Use case: Receipt extraction, document OCR
   - Gemini 2.0 Flash for cost-effective processing

2. **Text Processing:** Mistral AI
   - Region: EU-native (France)
   - Use case: Transaction categorization, text analysis
   - Mistral Large for complex reasoning, Mistral Small for simple tasks

### Fallback Provider (non-sensitive data only)

3. **OpenAI GPT-4o:** Only for tasks not involving personal data
   - Use case: General text generation, non-PII analysis
   - Never for member data, bank details, or PII

### Provider Interface

```typescript
interface ILLMAdapter {
  // Text completion
  complete(prompt: string, options?: LLMOptions): Promise<string>;

  // Structured extraction with Zod validation
  extractStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;

  // Vision capabilities (optional)
  analyzeImage?(image: Buffer, prompt: string): Promise<string>;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  containsPII?: boolean; // If true, must use EU-compliant provider
}
```

### Provider Selection Logic

```typescript
function selectProvider(options: LLMOptions): ILLMAdapter {
  // Vision tasks → Gemini
  if (options.requiresVision) {
    return geminiAdapter;
  }

  // PII data → EU-only providers
  if (options.containsPII) {
    return mistralAdapter; // or geminiAdapter
  }

  // Non-sensitive → any provider (cost optimization)
  return openaiAdapter; // optional fallback
}
```

### Cost Management

- **Caching:** Cache AI responses for repeated queries (e.g., same receipt structure)
- **Batching:** Process multiple items together where possible
- **Model Tiering:** Use smaller models for simple tasks
- **Budgets:** Per-club AI usage limits to prevent cost overrun

Estimated costs:
- Receipt OCR: €0.01-0.03 per receipt (Gemini Flash)
- Categorization: €0.001 per transaction (Mistral Small)

## Consequences

**Positive:**

- GDPR/DSGVO compliance for AI features
- No dependence on OpenAI EU residency (practically unavailable)
- Provider redundancy (can switch if one fails)
- Cost optimization via model tiering
- Clear interface for testing with mocks

**Negative:**

- Multiple provider accounts to manage
- Different API patterns per provider
- Gemini and Mistral have different capabilities than OpenAI
- Additional complexity in provider selection logic

**Neutral:**

- Must implement adapter for each provider
- Configuration via environment variables
- Usage tracking needed for cost monitoring

## Implementation Phases

1. **Phase 6+ (Post-MVP):** Implement LLM interface and Gemini adapter
2. **Receipt OCR Feature:** Add Gemini Vision for document processing
3. **Categorization Feature:** Add Mistral for text processing
4. **Optional:** Add OpenAI fallback for non-PII tasks

## Configuration

```env
# Primary providers (EU-compliant)
GOOGLE_CLOUD_PROJECT=ktb-clubmanager
GOOGLE_CLOUD_REGION=europe-west4
MISTRAL_API_KEY=xxx

# Optional fallback (non-PII only)
OPENAI_API_KEY=xxx  # Optional, for non-sensitive tasks
```

## References

- [Vertex AI Gemini Regions](https://cloud.google.com/vertex-ai/docs/general/locations)
- [Mistral AI Platform](https://mistral.ai/)
- ADR-0011: External Service Adapter Pattern
- GDPR Article 44-49 (International data transfers)
