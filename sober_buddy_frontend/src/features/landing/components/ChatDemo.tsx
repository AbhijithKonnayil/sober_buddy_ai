import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Card } from '../../../shared/components/Card/Card';
import { MessageSquare, Send, Sparkles, User } from 'lucide-react';
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

  const [isTyping, setIsTyping] = useState(false);

  const handlePromptClick = (promptKey: string, replyKey: string) => {
    if (isTyping) return;

    const userMsg: Message = {
      sender: 'user',
      text: t(promptKey),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI thinking and typing response
    setTimeout(() => {
      const aiReply: Message = {
        sender: 'ai',
        text: t(replyKey),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiReply]);
      setIsTyping(false);
    }, 1200);
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
              onClick={() => handlePromptClick(p.promptKey, p.replyKey)}
              disabled={isTyping}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mock Textbox Footer */}
      <div className="chat-demo-footer">
        <input 
          type="text" 
          placeholder="Ask SoberBuddy..." 
          className="chat-demo-input" 
          disabled 
        />
        <button className="chat-send-btn" disabled>
          <Send size={16} />
        </button>
      </div>
    </Card>
  );
};
export default ChatDemo;
