const { buildSystemPrompt, buildEmergencyScriptPrompt } = require("./chatUtils");

async function callGemini(apiKey, prompt) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callOpenAI(apiKey, prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    null
  );
}

async function generateText(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      const text = await callGemini(apiKey, prompt);
      if (text) {
        return text;
      }
    }

    if (process.env.OPENAI_API_KEY) {
      return await callOpenAI(process.env.OPENAI_API_KEY, prompt);
    }
  } catch (error) {
    console.warn("AI generation failed, using fallback.", error);
  }

  return null;
}

async function generateAssistantReply({ role, message, profile }) {
  const systemPrompt = buildSystemPrompt({ role, profile, message });
  const fallbackReply =
    role === "caregiver"
      ? "Try a calm, brief response: \"I'm here with you. Let's take this one step at a time.\""
      : "You do not have to solve this alone right now. Take one small step: breathe, drink water, or take a 5-minute walk.";

  const text = await generateText(systemPrompt);
  return text || fallbackReply;
}

function buildFallbackEmergencyScripts({ profile = {}, contact = {} }) {
  const substance = profile.substance || "substances";
  const triggers = (profile.triggers || []).join(", ") || "stress";
  const coping = (profile.copingStrategies || []).join(", ") || "walking";
  const contactName = contact.name || "Emergency contact";

  return {
    soberScript: `I am feeling a strong urge right now, but this is a temporary spike. I am recovering from ${substance} and my mind is reacting to a trigger. I will breathe deeply. ${coping} helps me. I am safe in this second.`,
    caregiverScript: `Hello, I am calling about a potential relapse risk for someone recovering from ${substance}. Known triggers include ${triggers}. Our coping plan includes ${coping}. Please help coordinate support for ${contactName}.`,
  };
}

async function generateEmergencyScripts({ profile = {}, contact = {} }) {
  const soberPrompt = buildEmergencyScriptPrompt({
    profile,
    contact,
    role: "sober",
  });
  const caregiverPrompt = buildEmergencyScriptPrompt({
    profile,
    contact,
    role: "caregiver",
  });

  const fallback = buildFallbackEmergencyScripts({ profile, contact });

  const [soberScript, caregiverScript] = await Promise.all([
    generateText(soberPrompt),
    generateText(caregiverPrompt),
  ]);

  return {
    soberScript: soberScript || fallback.soberScript,
    caregiverScript: caregiverScript || fallback.caregiverScript,
  };
}

module.exports = {
  generateAssistantReply,
  generateEmergencyScripts,
  buildFallbackEmergencyScripts,
};
