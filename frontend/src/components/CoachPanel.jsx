import { useEffect, useState } from 'react';
import { api } from '../api';
import VoiceInputButton from './VoiceInputButton';

const PRIVACY_NOTE = '你输入的内容将发送给AI处理，请勿填写敏感个人信息';

function renderLiteMarkdown(text) {
  return text.split('\n').map((line, i, lines) => (
    <span key={i}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function formatLastActive(isoLike) {
  if (!isoLike) return '';
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CoachPanel({ skill }) {
  const [situation, setSituation] = useState('');
  const [conversation, setConversation] = useState([]);
  const [draft, setDraft] = useState('');
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | streaming | error
  const [errorMsg, setErrorMsg] = useState('');
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setConversation([]);
    setStarted(false);
    setLastMessageAt(null);
    setSituation('');
    setDraft('');
    setErrorMsg('');
    setStatus('idle');

    api
      .getCoachHistory(skill.id)
      .then((data) => {
        if (cancelled) return;
        if (data.messages && data.messages.length > 0) {
          setConversation(data.messages.map(({ role, content }) => ({ role, content })));
          setStarted(true);
          setLastMessageAt(data.last_message_at);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [skill.id]);

  async function consumeStream(streamPromise) {
    setConversation((c) => [...c, { role: 'assistant', content: '' }]);
    try {
      const stream = await streamPromise;
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setConversation((c) => {
          const next = [...c];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || '陪练暂时休息中，请稍后再试');
    }
  }

  async function handleStart(e) {
    e.preventDefault();
    if (!situation.trim() || status === 'streaming') return;
    const message = situation;
    setErrorMsg('');
    setStarted(true);
    setStatus('streaming');
    setConversation([{ role: 'user', content: message }]);
    setSituation('');
    await consumeStream(api.coachMessage(skill.id, message));
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!draft.trim() || status === 'streaming') return;
    const message = draft;
    setDraft('');
    setErrorMsg('');
    setStatus('streaming');
    setConversation((c) => [...c, { role: 'user', content: message }]);
    await consumeStream(api.coachMessage(skill.id, message));
  }

  async function handleReset() {
    setStatus('idle');
    setErrorMsg('');
    try {
      await api.resetCoach(skill.id);
    } catch {
      // 即使清空失败，也让学员可以在本地重新开始
    }
    setSituation('');
    setConversation([]);
    setDraft('');
    setStarted(false);
    setLastMessageAt(null);
  }

  if (loadingHistory) {
    return (
      <section className="border border-vermilion/20 rounded-2xl p-6 bg-white/50">
        <h2 className="text-sm font-semibold text-vermilion mb-1">AI陪练</h2>
        <p className="text-sm text-ink/40">加载中…</p>
      </section>
    );
  }

  return (
    <section className="border border-vermilion/20 rounded-2xl p-6 bg-white/50">
      <h2 className="text-sm font-semibold text-vermilion mb-1">AI陪练</h2>
      <p className="text-sm text-ink/60 leading-relaxed mb-4">
        告诉我你现在的真实处境，
        <br />
        我会根据本周Skill帮你设计专属练习。
      </p>

      {!started && (
        <form onSubmit={handleStart} className="space-y-2">
          <div className="relative">
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="描述你现在面对的真实情况，越具体越好"
              className="w-full border border-ink/15 rounded-lg p-3 pr-11 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
              rows={3}
            />
            <VoiceInputButton
              onResult={(text) => setSituation((prev) => (prev ? `${prev}${text}` : text))}
            />
          </div>
          <p className="text-xs text-ink/35">{PRIVACY_NOTE}</p>
          <button
            type="submit"
            disabled={!situation.trim()}
            className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            开始陪练
          </button>
        </form>
      )}

      {started && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink/40">
              {lastMessageAt ? `继续上次的对话 · ${formatLastActive(lastMessageAt)}` : ''}
            </p>
            <button type="button" onClick={handleReset} className="text-xs text-ink/40 underline shrink-0">
              开始新对话
            </button>
          </div>

          <div className="space-y-3">
            {conversation.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed text-left ${
                    m.role === 'user' ? 'bg-vermilion/10 text-ink' : 'bg-ink/5 text-ink'
                  }`}
                >
                  {m.content
                    ? renderLiteMarkdown(m.content)
                    : status === 'streaming' && i === conversation.length - 1
                    ? '…'
                    : ''}
                </div>
              </div>
            ))}
          </div>

          {errorMsg && <p className="text-vermilion text-sm">{errorMsg}</p>}

          <form onSubmit={handleContinue} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="继续对话…"
                  disabled={status === 'streaming'}
                  className="w-full border border-ink/15 rounded-lg pl-3 pr-11 py-2 text-sm bg-white/60 focus:outline-none focus:border-vermilion disabled:opacity-50"
                />
                <VoiceInputButton
                  onResult={(text) => setDraft((prev) => (prev ? `${prev}${text}` : text))}
                  disabled={status === 'streaming'}
                  compact
                />
              </div>
              <button
                type="submit"
                disabled={status === 'streaming' || !draft.trim()}
                className="bg-vermilion text-paper rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
              >
                发送
              </button>
            </div>
            <p className="text-xs text-ink/35">{PRIVACY_NOTE}</p>
          </form>
        </div>
      )}
    </section>
  );
}
