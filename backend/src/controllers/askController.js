const { GoogleGenAI } = require('@google/genai');
const { operationalTools, executeOperationalTool } = require('../services/askToolService');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const MAX_TOOL_ROUNDS = 4;
const SYSTEM_INSTRUCTION = `You are Kestrel's supply-chain control-tower assistant.
Answer only from an approved operational tool result. Never invent metrics, dates, causes, or comparisons.
State the period used and key numbers. Include any data-quality warning supplied by a tool.`;

async function askQuestion(request, response, next) {
  const question = String(request.body?.question || '').trim();
  const previousInteractionId = request.body?.previous_interaction_id;

  if (!question) {
    response.status(400).json({ error: 'question is required' });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    response.status(503).json({
      error: 'Gemini is not configured. Set GEMINI_API_KEY in your environment before using /api/ask.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let input = question;
    let interactionId = previousInteractionId;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const interaction = await ai.interactions.create({
        model: MODEL,
        input,
        tools: operationalTools,
        previous_interaction_id: interactionId,
        system_instruction: SYSTEM_INSTRUCTION,
        // Require a data tool for the initial user question. After tool results
        // are supplied, Gemini may write the final response normally.
        ...(typeof input === 'string' ? {
          generation_config: {
            tool_choice: {
              allowed_tools: {
                mode: 'any',
                tools: operationalTools.map((tool) => tool.name),
              },
            },
          },
        } : {}),
      });

      const toolCalls = interaction.steps.filter((step) => step.type === 'function_call');
      if (toolCalls.length === 0) {
        response.json({
          answer: interaction.output_text,
          interaction_id: interaction.id,
          model: MODEL,
        });
        return;
      }

      input = toolCalls.map((toolCall) => ({
        type: 'function_result',
        name: toolCall.name,
        call_id: toolCall.id,
        result: [{ type: 'text', text: JSON.stringify(executeOperationalTool(toolCall.name, toolCall.arguments)) }],
      }));
      interactionId = interaction.id;
    }

    throw new Error('Gemini exceeded the maximum allowed tool rounds');
  } catch (error) {
    // Gemini errors are external-service failures, not client input errors.
    response.status(502).json({
      error: 'Gemini request failed',
      provider_message: error.message,
      model: MODEL,
    });
  }
}

module.exports = { askQuestion };
