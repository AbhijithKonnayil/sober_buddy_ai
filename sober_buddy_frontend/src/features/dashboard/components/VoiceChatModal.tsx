import React, { useEffect, useId, useRef } from 'react';
import { MessageCircle, Mic, MicOff, Send, X } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useVoiceChat } from '../hooks/useVoiceChat';
import './VoiceChatModal.css';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  role: 'sober' | 'caregiver';
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  userId,
  role,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    inputText,
    setInputText,
    isListening,
    isSending,
    error,
    sendMessage,
    startListening,
    stopListening,
  } = useVoiceChat({ userId, role, isOpen });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(inputText);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal-content glass-effect voice-chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header voice-chat-header">
          <div className="voice-chat-contact">
            <span className="voice-chat-avatar" aria-hidden="true">
              <MessageCircle size={20} />
            </span>
            <div>
              <h3 id={titleId}>
                {role === 'sober'
                  ? t('dashboard_voice_modal_title_sober')
                  : t('dashboard_voice_modal_title_caregiver')}
              </h3>
              <p className="voice-chat-status">
                <span className={`voice-chat-presence ${isListening ? 'listening' : ''}`} />
                {isListening
                  ? t('dashboard_voice_status_listening')
                  : t('dashboard_voice_status_online')}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label={t('dashboard_modal_close')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div
          className="voice-messages voice-chat-thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t('dashboard_voice_messages_label')}
        >
          {messages.length === 0 ? (
            <p className="voice-chat-empty">{t('dashboard_voice_placeholder')}</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`voice-message-row ${message.sender}`}
              >
                <p className="voice-message-text">{message.transcript}</p>
              </div>
            ))
          )}
          {isSending && (
            <div className="voice-message-row ai voice-chat-typing" aria-label={t('dashboard_voice_status_typing')}>
              <span />
              <span />
              <span />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <p id="voice-chat-error" className="voice-error" role="alert">
            {t(error)}
          </p>
        )}

        <form className="voice-input-form" onSubmit={handleSubmit}>
          <label htmlFor="voice-chat-input" className="sr-only">
            {t('dashboard_voice_input_label')}
          </label>
          <input
            id="voice-chat-input"
            type="text"
            className="form-input voice-text-input"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder={t('dashboard_voice_input_placeholder')}
            disabled={isSending}
            aria-describedby={error ? 'voice-chat-error' : undefined}
          />
          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={isListening ? stopListening : startListening}
            aria-label={
              isListening
                ? t('dashboard_voice_btn_stop')
                : t('dashboard_voice_btn_listen')
            }
            aria-pressed={isListening}
            disabled={isSending}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={isSending || !inputText.trim()}
            aria-busy={isSending}
          >
            <Send size={18} aria-hidden="true" />
            <span className="sr-only">{t('dashboard_voice_btn_send')}</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
