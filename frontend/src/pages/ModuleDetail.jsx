import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import BottomNav from '../components/BottomNav';
import SkillCard from '../components/SkillCard';

export default function ModuleDetail() {
  const { slug } = useParams();
  const [module_, setModule] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setModule(null);
    setError('');
    api
      .getModule(slug)
      .then(setModule)
      .catch((err) => setError(err.message));
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="max-w-content mx-auto px-6 pt-6 pb-4">
        <Link to="/modules" className="text-xs text-ink/40">← 返回学习路径</Link>
        {module_ && (
          <>
            <h1 className="text-lg font-semibold text-ink mt-4">{module_.name}</h1>
            <p className="text-sm text-ink/60 mt-1">{module_.subtitle}</p>
          </>
        )}
      </header>

      <main className="max-w-content mx-auto px-6 space-y-8">
        {error && <p className="text-vermilion text-sm">{error}</p>}
        {module_?.stages.map((stage, i) => (
          <section key={stage.stage_order}>
            <h2 className="text-sm font-semibold text-ink/70 mb-3">
              环节{i + 1} · {stage.stage_name}
            </h2>
            <div className="space-y-2">
              {stage.items.map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
