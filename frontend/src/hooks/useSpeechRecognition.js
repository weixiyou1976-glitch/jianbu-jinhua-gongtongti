import { useCallback, useEffect, useRef, useState } from 'react';

const RecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeechRecognition() {
  const isSupported = !!RecognitionCtor;
  const recognitionRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupported) return undefined;
    const recognition = new RecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [isSupported]);

  const start = useCallback((onResult) => {
    const recognition = recognitionRef.current;
    if (!recognition || isRecording) return;
    setError('');
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript) onResult(transcript);
    };
    recognition.onerror = (event) => {
      setError(event.error === 'no-speech' ? '没有听到声音，请重试' : '语音识别失败，请重试或直接打字');
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setError('无法启动语音识别，请改用文字输入');
    }
  }, [isRecording]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isSupported, isRecording, error, start, stop };
}
