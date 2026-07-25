const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { resolveRiskFlag, assertSessionOwner } = require("./lib/chatUtils");
const { transcribeAudioBuffer } = require("./lib/speech");
const {
  generateAssistantReply,
  generateEmergencyScripts,
} = require("./lib/aiProvider");

admin.initializeApp();

const firestore = admin.firestore;
const { FieldValue } = require("firebase-admin/firestore");

function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }
  return context.auth.uid;
}

async function getSoberProfile(userId) {
  const profileDoc = await firestore()
    .collection("soberProfiles")
    .doc(userId)
    .get();
  return profileDoc.exists ? profileDoc.data() : {};
}

async function resolveProfileForChat(userId, role) {
  if (role === "caregiver") {
    const userDoc = await firestore().collection("users").doc(userId).get();
    const linkedIds = userDoc.exists ? userDoc.data().linkedUserIds || [] : [];
    if (linkedIds.length > 0) {
      return getSoberProfile(linkedIds[0]);
    }
  }

  return getSoberProfile(userId);
}

async function getEmergencyContact(soberId) {
  const contactDoc = await firestore()
    .collection("emergencyContacts")
    .doc(`${soberId}_primary`)
    .get();
  return contactDoc.exists ? contactDoc.data() : {};
}

async function getLinkedCaregiverIds(soberId) {
  const linksSnap = await firestore()
    .collection("links")
    .where("soberId", "==", soberId)
    .where("status", "==", "accepted")
    .get();

  return linksSnap.docs.map((doc) => doc.data().caregiverId).filter(Boolean);
}

exports.transcribeAudio = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const { audioBase64, languageCode = "en-US" } = data || {};

  if (!audioBase64) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "audioBase64 is required.",
    );
  }

  try {
    const audioBytes = Buffer.from(audioBase64, "base64");
    const transcript = await transcribeAudioBuffer(audioBytes, languageCode);
    return { transcript, languageCode };
  } catch (error) {
    console.error("Transcription failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to transcribe audio.",
    );
  }
});

exports.createChatSession = functions.https.onCall(async (data, context) => {
  const authUid = requireAuth(context);
  const role = data?.role || "sober";
  const userId = data?.userId || authUid;

  if (userId !== authUid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Cannot create a session for another user.",
    );
  }

  const sessionRef = await firestore().collection("chatSessions").add({
    userId,
    role,
    startedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    highestRiskFlag: "low",
  });

  return {
    sessionId: sessionRef.id,
    role,
    userId,
  };
});

exports.sendChatMessage = functions.https.onCall(async (data, context) => {
  const authUid = requireAuth(context);

  const sessionId = data?.sessionId;
  const userId = data?.userId || authUid;
  const role = data?.role || "sober";
  const transcript = data?.transcript || data?.message || "";
  const audioBase64 = data?.audioBase64;

  if (userId !== authUid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Cannot send messages for another user.",
    );
  }

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

  try {
    assertSessionOwner(sessionDoc.data(), authUid);
  } catch {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You do not have access to this chat session.",
    );
  }

  const profile = await resolveProfileForChat(userId, role);
  const riskFlag = resolveRiskFlag(finalTranscript);

  const messageRef = await sessionRef.collection("messages").add({
    sender: "user",
    transcript: finalTranscript,
    riskFlag,
    timestamp: FieldValue.serverTimestamp(),
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
    timestamp: FieldValue.serverTimestamp(),
  });

  const highestRiskFlag =
    riskFlag === "high" || aiRiskFlag === "high"
      ? "high"
      : riskFlag === "medium" || aiRiskFlag === "medium"
        ? "medium"
        : "low";

  await sessionRef.update({
    lastMessageAt: FieldValue.serverTimestamp(),
    highestRiskFlag,
  });

  return {
    sessionId,
    messageId: messageRef.id,
    transcript: finalTranscript,
    aiReply,
    riskFlag: highestRiskFlag,
  };
});

exports.generateEmergencyScript = functions.https.onCall(
  async (data, context) => {
    const authUid = requireAuth(context);
    const soberId = data?.soberId || authUid;

    if (soberId !== authUid) {
      const linkDoc = await firestore()
        .collection("links")
        .doc(`${soberId}_${authUid}`)
        .get();

      if (!linkDoc.exists || linkDoc.data().status !== "accepted") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized to generate scripts for this profile.",
        );
      }
    }

    const profile = await getSoberProfile(soberId);
    const contact = await getEmergencyContact(soberId);
    const scripts = await generateEmergencyScripts({ profile, contact });

    return {
      soberId,
      ...scripts,
    };
  },
);

exports.simulateLocationAlert = functions.https.onCall(
  async (data, context) => {
    const authUid = requireAuth(context);
    const soberId = data?.soberId || authUid;
    const locationLabel = data?.locationLabel || "High-risk area";

    if (soberId !== authUid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the sober user can simulate their location alerts.",
      );
    }

    const caregiverIds = await getLinkedCaregiverIds(soberId);
    const alertRef = await firestore()
      .collection("alertEvents")
      .add({
        soberId,
        caregiverIdsNotified: caregiverIds,
        triggerType: "location",
        sourceId: `simulated_${Date.now()}`,
        locationLabel,
        soberRespondedFirst: true,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });

    return {
      alertId: alertRef.id,
      soberId,
      caregiverIdsNotified: caregiverIds,
      status: "pending",
    };
  },
);

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
    const sessionData = (await sessionRef.get()).data() || {};
    const soberId = sessionData.userId;

    await sessionRef.update({
      highestRiskFlag: riskFlag,
      lastMessageAt: FieldValue.serverTimestamp(),
    });

    if (riskFlag === "high" && soberId) {
      const caregiverIds = await getLinkedCaregiverIds(soberId);
      await firestore().collection("alertEvents").add({
        soberId,
        caregiverIdsNotified: caregiverIds,
        triggerType: "chat_risk",
        sourceId: messageId,
        soberRespondedFirst: false,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return null;
  });

module.exports = {
  ...module.exports,
  ...require("./lib/chatUtils"),
  transcribeAudioBuffer,
  generateAssistantReply,
  generateEmergencyScripts,
};
