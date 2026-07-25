import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { MessageSquare, Send, Sparkles, User, Mic } from 'lucide-react';
import './ChatDemo.css';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const ChatDemo: React.FC = () => {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hi! I am SoberBuddy, your recovery companion. Let me know how you are feeling or select one of the quick prompts below.',
      timestamp: '12:00 PM'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        setInputText(fullTranscript);
      };

      rec.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Speech recognition error:', event.error);
        setIsVoiceRecording(false);
      };

      rec.onend = () => {
        setIsVoiceRecording(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    if (isVoiceRecording) {
      recognitionRef.current.stop();
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setIsVoiceRecording(false);
      }
    }
  };

  const handleSendText = (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    // Stop voice if still recording
    if (isVoiceRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsVoiceRecording(false);
    }

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const lower = textToSend.toLowerCase();
    let reply = '';
    
    if (lower.includes('craving') || lower.includes('drink') || lower.includes('smoke') || lower.includes('use')) {
      reply = "Cravings can feel intense, but they usually peak within 15 minutes. Try taking 5 slow, deep breaths, or step away for a short walk. You've got this.";
    } else if (lower.includes('stress') || lower.includes('anxious') || lower.includes('anxiety') || lower.includes('overwhelmed')) {
      reply = "Stress is a very common trigger. Let's take a pause together. Try relaxing your shoulders and taking a slow breath. What is one small thing you can control right now?";
    } else if (lower.includes('lonely') || lower.includes('loneliness') || lower.includes('sad')) {
      reply = "Loneliness is a hard trigger, but you aren't alone. I am here to support you. Reaching out to a trusted friend or peer can also make a huge difference. Shall we try a grounding exercise?";
    } else {
      reply = "I hear you. Grounding yourself in the present moment is a great step in your recovery. Let's take things one step at a time today.";
    }

    setTimeout(() => {
      const aiReply: Message = {
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReply]);
      setIsTyping(false);
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    handleSendText(text);
  };

  const handlePromptClick = (promptKey: string) => {
    if (isTyping) return;
    setInputText('');
    handleSendText(t(promptKey));
  };

  const prompts = [
    { 
      label: t('landing_chat_demo_prompt_1'), 
      promptKey: 'landing_chat_demo_prompt_1', 
      replyKey: 'landing_chat_demo_reply_1' 
    },
    { 
      label: t('landing_chat_demo_prompt_2'), 
      promptKey: 'landing_chat_demo_prompt_2', 
      replyKey: 'landing_chat_demo_reply_2' 
    },
    { 
      label: t('landing_chat_demo_prompt_3'), 
      promptKey: 'landing_chat_demo_prompt_3', 
      replyKey: 'landing_chat_demo_reply_3' 
    }
  ];

  return (
    <Card className="chat-demo-card" glass={true} hoverable={false}>
      <div className="chat-demo-header">
        <MessageSquare className="chat-icon" size={20} />
        <div>
          <h4>{t('landing_chat_demo_title')}</h4>
          <span className="chat-status-badge">Online</span>
        </div>
      </div>

      {/* Message Window */}
      <div className="chat-demo-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
            <div className="avatar-wrapper">
              {msg.sender === 'user' ? <User size={14} /> : <Sparkles size={14} fill="var(--color-primary)" />}
            </div>
            <div className="bubble-content">
              <span className="bubble-sender">
                {msg.sender === 'user' ? t('landing_chat_demo_user_label') : t('landing_chat_demo_ai_label')}
              </span>
              <p className="bubble-text">{msg.text}</p>
              <span className="bubble-time">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble-row ai-row">
            <div className="avatar-wrapper">
              <Sparkles size={14} />
            </div>
            <div className="bubble-content">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Prompts list */}
      <div className="chat-demo-prompts">
        <span className="prompts-title">{t('landing_chat_demo_subtitle')}</span>
        <div className="prompts-grid">
          {prompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="chat-prompt-btn"
              onClick={() => handlePromptClick(p.promptKey)}
              disabled={isTyping}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real Textbox / Voice Input Footer */}
      <form onSubmit={handleFormSubmit} className="chat-demo-footer">
        <button 
          type="button" 
          onClick={toggleVoiceInput}
          className={`landing-voice-mic-btn ${isVoiceRecording ? 'recording' : ''}`}
          title="Speak to dictate"
        >
          <Mic size={16} />
        </button>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isVoiceRecording ? 'Listening... tap again to stop' : 'Ask SoberBuddy...'} 
          className="chat-demo-input" 
          disabled={isVoiceRecording}
        />
        <button 
          type="submit" 
          className="chat-send-btn active" 
          disabled={!inputText.trim() || isTyping}
        >
          <Send size={16} />
        </button>
      </form>
    </Card>
  );
};
export default ChatDemo;
