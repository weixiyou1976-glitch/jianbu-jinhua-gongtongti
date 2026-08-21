import { NavLink } from 'react-router-dom';

const items = [
  { to: '/dashboard', label: '主页' },
  { to: '/skills', label: 'Skill库' },
  { to: '/stamp', label: '策印' },
  { to: '/progress', label: '进度' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-paper/95 backdrop-blur border-t border-vermilion/15 z-40">
      <div className="max-w-content mx-auto flex justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm tracking-wide transition-colors ${
                isActive ? 'text-vermilion font-semibold' : 'text-ink/50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
