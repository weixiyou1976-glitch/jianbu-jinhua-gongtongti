import { useState } from 'react';
import { api } from '../api';

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

export default function CoachPanel({ skill }) {
  const [situation, setSituation] = useState('');
  const [conversation, setConversation] = useState([]);
  const [draft, setDraft] = useState('');
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | streaming | error
  const [errorMsg, setErrorMsg] = useState('');

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
    setErrorMsg('');
    setStarted(true);
    setStatus('streaming');
    setConversation([{ role: 'user', content: situation }]);
    await consumeStream(api.coachStart(skill.id, situation));
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!draft.trim() || status === 'streaming') return;
    const message = draft;
    const history = conversation.map(({ role, content }) => ({ role, content }));
    setDraft('');
    setErrorMsg('');
    setStatus('streaming');
    setConversation((c) => [...c, { role: 'user', content: message }]);
    await consumeStream(api.coachReply(skill.id, history, message));
  }

  function handleReset() {
    setSituation('');
    setConversation([]);
    setDraft('');
    setStarted(false);
    setStatus('idle');
    setErrorMsg('');
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
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="描述你现在面对的真实情况，越具体越好"
            className="w-full border border-ink/15 rounded-lg p-3 text-sm bg-white/60 focus:outline-none focus:border-vermilion"
            rows={3}
          />
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
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="继续对话…"
                disabled={status === 'streaming'}
                className="flex-1 min-w-0 border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white/60 focus:outline-none focus:border-vermilion disabled:opacity-50"
              />
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

          <button type="button" onClick={handleReset} className="text-xs text-ink/40 underline">
            重新开始
          </button>
        </div>
      )}
    </section>
  );
}
