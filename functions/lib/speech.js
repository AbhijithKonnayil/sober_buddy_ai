const speech = require("@google-cloud/speech");

const client = new speech.SpeechClient();

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

module.exports = { transcribeAudioBuffer };
