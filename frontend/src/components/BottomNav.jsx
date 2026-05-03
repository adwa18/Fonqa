// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { Flame, Heart, MessageCircle, User } from 'lucide-react';

const NAV = [
  { to: '/',        icon: Flame,         label: 'Discover', end: true },
  { to: '/liked-me', icon: Heart,        label: 'Liked Me' },
  { to: '/matches', icon: MessageCircle, label: 'Matches' },
  { to: '/profile', icon: User,          label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav flex items-center border-t flex-shrink-0"
      style={{ background: 'var(--tg-theme-bg-color, var(--bg))', borderColor: 'var(--border)' }}>
      {NAV.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center pt-3 pb-1 gap-0.5 transition-colors ${isActive ? '' : 'text-gray-600'}`}
          style={({ isActive }) => ({ color: isActive ? 'var(--brand)' : undefined })}>
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
