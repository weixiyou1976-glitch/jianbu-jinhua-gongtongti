import { useEffect, useState } from 'react';
import { api } from '../api';
import VoiceInputButton from './VoiceInputButton';
import AoLongAvatar from './AoLongAvatar';

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

const EXPIRED_MSG = '体验时间已结束，欢迎加入渐步';

export default function TrialCoachPanel({ skill, onExpired }) {
  const [situation, setSituation] = useState('');
  const [conversation, setConversation] = useState([]);
  const [draft, setDraft] = useState('');
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | streaming | error
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getTrialCoachHistory()
      .then((data) => {
        if (cancelled) return;
        if (data.messages && data.messages.length > 0) {
          setConversation(data.messages.map(({ role, content }) => ({ role, content })));
          setStarted(true);
        }
      })
      .catch((err) => {
        if (err.message === EXPIRED_MSG) onExpired?.();
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (err.message === EXPIRED_MSG) {
        onExpired?.();
        return;
      }
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
    await consumeStream(api.trialCoachMessage(skill.id, message));
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!draft.trim() || status === 'streaming') return;
    const message = draft;
    setDraft('');
    setErrorMsg('');
    setStatus('streaming');
    setConversation((c) => [...c, { role: 'user', content: message }]);
    await consumeStream(api.trialCoachMessage(skill.id, message));
  }

  if (loadingHistory) {
    return (
      <section className="border border-vermilion/20 rounded-2xl p-6 bg-white/50">
        <div className="flex items-center gap-2 mb-1">
          <AoLongAvatar size={24} />
          <h2 className="text-sm font-bold text-vermilion">傲龙的数字分身</h2>
        </div>
        <p className="text-sm text-ink/40">加载中…</p>
      </section>
    );
  }

  return (
    <section className="border border-vermilion/20 rounded-2xl p-6 bg-white/50">
      <div className="flex items-center gap-2 mb-1">
        <AoLongAvatar size={24} />
        <h2 className="text-sm font-bold text-vermilion">傲龙的数字分身</h2>
      </div>
      <p className="text-xs text-ink/40 mb-3">装载了傲龙多年对人性和成长的研究</p>
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
