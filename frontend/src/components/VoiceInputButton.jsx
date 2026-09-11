import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

function MicIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

export default function VoiceInputButton({ onResult, disabled = false, compact = false }) {
  const { isSupported, isRecording, error, start, stop } = useSpeechRecognition();

  if (!isSupported) return null;

  function handleClick() {
    if (disabled) return;
    if (isRecording) {
      stop();
    } else {
      start(onResult);
    }
  }

  return (
    <div className={`absolute right-1.5 z-10 ${compact ? 'bottom-1.5' : 'bottom-2'}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isRecording ? '停止录音' : '语音输入'}
        aria-pressed={isRecording}
        className={`flex items-center justify-center rounded-xl bg-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${
          compact ? 'w-7 h-7' : 'w-8 h-8'
        } ${
          isRecording
            ? 'text-vermilion ring-2 ring-vermilion/40 animate-pulse'
            : 'text-ink/50 hover:text-vermilion'
        }`}
      >
        <MicIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
      {error && (
        <p className="absolute bottom-full right-0 mb-1 text-xs text-vermilion whitespace-nowrap z-10">{error}</p>
      )}
    </div>
  );
}
