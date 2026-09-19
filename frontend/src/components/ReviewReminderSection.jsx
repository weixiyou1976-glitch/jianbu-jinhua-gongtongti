import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ReviewReminderSection({ reminders, onOpened }) {
  if (!reminders || reminders.length === 0) return null;

  function handleOpen(id) {
    api.markReviewOpened(id).catch(() => {});
    onOpened(id);
  }

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-ink mb-3">📚 复习提醒</h3>
      <div className="space-y-2">
        {reminders.map((r) => (
          <div
            key={r.id}
            className="border border-vermilion/20 rounded-xl p-4 bg-white/50 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink mb-1">{r.skill_name}</p>
              <p className="text-xs text-ink/60">{r.prompt}</p>
            </div>
            <Link
              to={`/skill/${r.skill_id}`}
              onClick={() => handleOpen(r.id)}
              className="shrink-0 text-xs text-vermilion border border-vermilion/30 rounded-full px-3 py-1.5 whitespace-nowrap"
            >
              去复习
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
