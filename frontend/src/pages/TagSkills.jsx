import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';
import SkillCard from '../components/SkillCard';

export default function TagSkills() {
  const { tag } = useParams();
  const [skills, setSkills] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSkills(null);
    setError('');
    api
      .searchSkills({ tag })
      .then(setSkills)
      .catch((err) => setError(err.message));
    window.scrollTo(0, 0);
  }, [tag]);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-6 pb-4">
        <Link to="/skills" className="text-xs text-ink/40">← 返回 Skill 库</Link>
        <h1 className="text-lg font-semibold text-ink mt-4">
          标签 · <span className="text-vermilion">#{tag}</span>
        </h1>
        {skills && <p className="text-xs text-ink/40 mt-1">共 {skills.length} 个 Skill</p>}
      </header>

      <main className="max-w-content mx-auto px-6">
        {error && <p className="text-vermilion text-sm">{error}</p>}
        {skills && skills.length === 0 && <p className="text-sm text-ink/40">这个标签下还没有 Skill。</p>}
        {skills && skills.length > 0 && (
          <div className="space-y-2">
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
