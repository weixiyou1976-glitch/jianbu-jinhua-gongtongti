import { useEffect, useRef, useState } from 'react';

function PlayIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function PauseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

export default function InsightAudioButton({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!src) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? '暂停音频' : '播放音频'}
      aria-pressed={playing}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0 ${
        playing ? 'bg-vermilion text-white' : 'bg-vermilion/10 text-vermilion hover:bg-vermilion/20'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {playing ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5 ml-0.5" />}
    </button>
  );
}
