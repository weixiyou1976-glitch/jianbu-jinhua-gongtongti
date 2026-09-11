import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function VoiceInputButton({ onResult, disabled = false }) {
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
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isRecording ? '停止录音' : '语音输入'}
        aria-pressed={isRecording}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isRecording
            ? 'bg-vermilion text-white animate-pulse'
            : 'bg-ink/5 text-ink/50 hover:bg-vermilion/10 hover:text-vermilion'
        }`}
      >
        🎤
      </button>
      {error && (
        <p className="absolute top-full right-0 mt-1 text-xs text-vermilion whitespace-nowrap z-10">{error}</p>
      )}
    </div>
  );
}
