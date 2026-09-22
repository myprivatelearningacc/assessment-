import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are an executive operational decision assistant.

Analyze the user's management question using ONLY facts contained in the supplied factMap.

Rules:
1. Use only facts contained in the supplied factMap.
2. Do not invent metrics, thresholds, targets, financial impacts, staffing requirements, or causal relationships.
3. Do not treat quotePrice or delivered quote value as recognized revenue.
4. Do not call lost quoted opportunity value lost revenue.
5. Do not treat roster resignation share as standard employee turnover.
6. If root cause cannot be established from the supplied facts, state that explicitly.
7. If production capacity is not explicitly measured, do not give a confident yes/no recommendation about increasing order intake.
8. Distinguish observed evidence from management implication.
9. Do not infer that workforce conditions caused delivery or profitability outcomes unless the factMap directly supports that relationship.
10. Use concise professional business language.
11. Return JSON only.

Required JSON:
{
  "decisions": [
    {
      "gap": "string",
      "evidence": "string",
      "impact": "string",
      "action": "string",
      "decision": "string"
    }
  ]
}

Normally return 1–3 decision objects depending on question scope.

If asked why deliveries are late and no stage-level timing evidence exists, state that exact stage-level cause cannot be confirmed.

If asked whether more orders should be accepted and explicit production capacity is unavailable, state that a safe intake increase cannot be quantified.

If asked about profitability, use Financial Ledger facts and do not attribute financial outcomes to HR or production without direct evidence.

Return JSON only with no markdown or surrounding explanation.`;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { question, factMap } = body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "question" in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!factMap || typeof factMap !== 'object' || Array.isArray(factMap)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "factMap" object in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `Management Question: ${question.trim()}\n\nSupplied factMap Data:\n${JSON.stringify(factMap, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text;
    let parsedData;

    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    if (!parsedData || !Array.isArray(parsedData.decisions)) {
      return new Response(JSON.stringify({ error: 'Model response did not contain a valid "decisions" array.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validDecisions = parsedData.decisions.filter(
      (item) => item && typeof item === 'object' && !Array.isArray(item)
    );

    if (validDecisions.length === 0) {
      return new Response(JSON.stringify({ error: 'Model response did not contain any valid decision objects.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ decisions: validDecisions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error processing decision request:', err);
    return new Response(JSON.stringify({
      error: 'An error occurred while evaluating the operational decision matrix.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
