import { useCallback, useEffect, useRef, useState } from 'react';
import { createChatSession, sendChatMessage } from '../api/chat.api';
import type { ChatMessage } from '../../../shared/types/recovery.types';

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  start: () => void;
  stop: () => void;
}

interface UseVoiceChatOptions {
  userId: string;
  role: 'sober' | 'caregiver';
  isOpen: boolean;
}

export function useVoiceChat({ userId, role, isOpen }: UseVoiceChatOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (!isOpen || sessionId) {
      return;
    }

    let cancelled = false;

    const initSession = async () => {
      try {
        const session = await createChatSession(role, userId);
        if (!cancelled) {
          setSessionId(session.sessionId);
        }
      } catch {
        if (!cancelled) {
          setError('voice_chat_error_session');
        }
      }
    };

    void initSession();

    return () => {
      cancelled = true;
    };
  }, [isOpen, role, sessionId, userId]);

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionId(null);
      setMessages([]);
      setInputText('');
      setError(null);
      setIsListening(false);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId || isSending) {
        return;
      }

      setIsSending(true);
      setError(null);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        transcript: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');

      try {
        const response = await sendChatMessage({
          sessionId,
          userId,
          role,
          transcript: trimmed,
        });

        const reply = response.aiReply;
        setMessages((prev) => [
          ...prev,
          {
            id: response.messageId,
            sender: 'ai',
            transcript: reply,
            riskFlag: response.riskFlag as ChatMessage['riskFlag'],
          },
        ]);

        if (reply && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop any ongoing speech
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      } catch {
        setError('voice_chat_error_send');
      } finally {
        setIsSending(false);
      }
    },
    [isSending, role, sessionId, userId],
  );

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError('voice_chat_error_no_speech');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError('voice_chat_error_speech');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        void sendMessage(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    messages,
    inputText,
    setInputText,
    isListening,
    isSending,
    error,
    sendMessage,
    startListening,
    stopListening,
  };
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}
