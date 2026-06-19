import { Link, useLocation } from 'react-router-dom';
import { Map, Trophy, Building2, MessageCircle, Menu } from 'lucide-react';

const TABS = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { path: '/bureaucracy', icon: Building2, label: 'Gov' },
  { path: '/watch-zones', icon: MessageCircle, label: 'Chat' },
  { path: '/settings', icon: Menu, label: 'More' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center justify-around safe-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {TABS.map(tab => {
        const active = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}