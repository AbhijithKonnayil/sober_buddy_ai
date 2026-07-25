function buildSystemPrompt({ role = "sober", profile = {}, message = "" }) {
  const substance = profile.substance || "your recovery journey";
  const triggers =
    (profile.triggers || []).join(", ") || "stress and loneliness";
  const copingStrategies =
    (profile.copingStrategies || []).join(", ") || "walking and reaching out";

  if (role === "caregiver") {
    return `You are SoberBuddy AI acting as a caregiver coach. Help the caregiver respond to a message from a loved one in recovery. Keep the tone calm, non-judgmental, and supportive. Ground your advice in their profile: substance=${substance}, triggers=${triggers}, coping strategies=${copingStrategies}. Suggest one small next step and avoid shaming or guilt. User message: ${message}`;
  }

  return `You are SoberBuddy AI, a supportive recovery companion for a person in recovery. The user is working through substance recovery. Be warm, non-judgmental, and concise. Ground your reply in their profile: substance=${substance}, triggers=${triggers}, coping strategies=${copingStrategies}. Offer one concrete action they can take right now, and if the message sounds urgent, encourage them to reach out to a trusted person or emergency support. User message: ${message}`;
}

function buildEmergencyScriptPrompt({ profile = {}, contact = {}, role = "sober" }) {
  const substance = profile.substance || "substances";
  const triggers = (profile.triggers || []).join(", ") || "stress";
  const coping = (profile.copingStrategies || []).join(", ") || "walking";
  const contactName = contact.name || "trusted contact";

  if (role === "caregiver") {
    return `Generate a brief emergency call script for a caregiver calling ${contactName} about a loved one in recovery from ${substance}. Known triggers: ${triggers}. Coping plan: ${coping}. Include relevant medical context for opioid risk if applicable. Keep it under 120 words. No shaming language.`;
  }

  return `Generate a brief self-talk calm script for someone in recovery from ${substance} experiencing an acute craving. Their triggers include ${triggers}. Their coping tools include ${coping}. Write in second person, under 80 words, grounding and non-clinical.`;
}

function resolveRiskFlag(message = "") {
  const normalized = message.toLowerCase();

  if (
    /(hurt|suicide|self-harm|overdose|kill|emergency|panic)/.test(normalized)
  ) {
    return "high";
  }

  if (
    /(craving|drink|use|relapse|lonely|stress|anxious|overwhelmed|need help|want to drink|want to use|want to relapse)/.test(
      normalized,
    )
  ) {
    return "medium";
  }

  if (/(talk|hello|hi|thanks|okay|fine|good)/.test(normalized)) {
    return "low";
  }

  return "low";
}

function assertSessionOwner(sessionData, authUid) {
  if (!sessionData || sessionData.userId !== authUid) {
    const error = new Error("permission-denied");
    error.code = "permission-denied";
    throw error;
  }
}

module.exports = {
  buildSystemPrompt,
  buildEmergencyScriptPrompt,
  resolveRiskFlag,
  assertSessionOwner,
};
