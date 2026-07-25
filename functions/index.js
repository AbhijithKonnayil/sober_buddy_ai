const functions = require('firebase-functions/v1');
const admin = require("firebase-admin");
const speech = require("@google-cloud/speech");

admin.initializeApp();

const firestore = admin.firestore;
const client = new speech.SpeechClient();

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

async function transcribeAudioBuffer(audioBytes, languageCode = "en-US") {
  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode,
      model: "latest_short",
    },
  };

  const [response] = await client.recognize(request);
  return (
    response.results
      ?.map((result) => result.alternatives?.[0]?.transcript || "")
      .join(" ")
      .trim() || ""
  );
}

async function generateAssistantReply({ role, message, profile }) {
  const systemPrompt = buildSystemPrompt({ role, profile, message });
  const fallbackReply =
    role === "caregiver"
      ? "Try a calm, brief response: “I’m here with you. Let’s take this one step at a time.”"
      : "You do not have to solve this alone right now. Take one small step: breathe, drink water, or take a 5-minute walk.";

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
            apiKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        }
      }

      if (process.env.OPENAI_API_KEY) {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: systemPrompt }],
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return text;
          }
        }
      }
    } catch (error) {
      console.warn("AI reply generation failed, using fallback reply.", error);
    }
  }

  return fallbackReply;
}

exports.transcribeAudio = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    const { audioBase64, languageCode = "en-US" } = req.body || {};

    if (!audioBase64) {
      res.status(400).send({ error: "audioBase64 is required" });
      return;
    }

    const audioBytes = Buffer.from(audioBase64, "base64");
    const transcript = await transcribeAudioBuffer(audioBytes, languageCode);

    res.status(200).send({
      transcript,
      languageCode,
    });
  } catch (error) {
    console.error("Transcription failed:", error);
    res.status(500).send({
      error: "Failed to transcribe audio",
      details: error.message,
    });
  }
});

exports.createChatSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Login required to start a chat session.",
    );
  }

  const role = data?.role || "sober";
  const userId = data?.userId || context.auth.uid;
  const sessionRef = await firestore().collection("chatSessions").add({
    userId,
    role,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    highestRiskFlag: "low",
  });

  return {
    sessionId: sessionRef.id,
    role,
    userId,
  };
});

exports.sendChatMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Login required to send a chat message.",
    );
  }

  const sessionId = data?.sessionId;
  const userId = data?.userId || context.auth.uid;
  const role = data?.role || "sober";
  const transcript = data?.transcript || data?.message || "";
  const audioBase64 = data?.audioBase64;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId is required.",
    );
  }

  let finalTranscript = transcript;
  if (audioBase64) {
    const audioBytes = Buffer.from(audioBase64, "base64");
    finalTranscript = await transcribeAudioBuffer(
      audioBytes,
      data?.languageCode || "en-US",
    );
  }

  if (!finalTranscript) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A message or audio transcript is required.",
    );
  }

  const sessionRef = firestore().collection("chatSessions").doc(sessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Chat session not found.",
    );
  }

  const profileDoc = await firestore()
    .collection("soberProfiles")
    .doc(userId)
    .get();
  const profile = profileDoc.exists ? profileDoc.data() : {};

  const riskFlag = resolveRiskFlag(finalTranscript);
  const messageRef = await sessionRef.collection("messages").add({
    sender: "user",
    transcript: finalTranscript,
    riskFlag,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  const aiReply = await generateAssistantReply({
    role,
    message: finalTranscript,
    profile,
  });
  const aiRiskFlag = resolveRiskFlag(aiReply);

  await sessionRef.collection("messages").add({
    sender: "ai",
    transcript: aiReply,
    riskFlag: aiRiskFlag,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await sessionRef.update({
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    highestRiskFlag:
      riskFlag === "high"
        ? "high"
        : aiRiskFlag === "high"
          ? "high"
          : riskFlag === "medium" || aiRiskFlag === "medium"
            ? "medium"
            : "low",
  });

  return {
    sessionId,
    messageId: messageRef.id,
    transcript: finalTranscript,
    aiReply,
    riskFlag,
  };
});

exports.onMessageCreated = functions.firestore
  .document("chatSessions/{sessionId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const sessionId = context.params.sessionId;
    const messageId = context.params.messageId;

    if (!message || message.sender !== "user") {
      return null;
    }

    const riskFlag =
      message.riskFlag || resolveRiskFlag(message.transcript || "");
    const sessionRef = firestore().collection("chatSessions").doc(sessionId);

    await sessionRef.update({
      highestRiskFlag: riskFlag,
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (riskFlag === "high") {
      await firestore()
        .collection("alertEvents")
        .add({
          soberId: (await sessionRef.get()).data()?.userId || null,
          caregiverIdsNotified: [],
          triggerType: "chat_risk",
          sourceId: messageId,
          soberRespondedFirst: false,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    return null;
  });

module.exports = {
  buildSystemPrompt,
  resolveRiskFlag,
  transcribeAudioBuffer,
  generateAssistantReply,
};
