import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { Map, Trophy, Building2, MessageCircle, Menu } from 'lucide-react';

const TABS = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { path: '/bureaucracy', icon: Building2, label: 'Gov' },
  { path: '/watch-zones', icon: MessageCircle, label: 'Chat' },
  { path: '/settings', icon: Menu, label: 'More' },
];

function findTabRoot(pathname) {
  for (const t of TABS) {
    if (t.path === '/') continue;
    if (pathname === t.path || pathname.startsWith(t.path + '/')) {
      return t.path;
    }
  }
  return null;
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabHistoryRef = useRef({});

  useEffect(() => {
    const pathname = location.pathname;
    const isRootTab = TABS.some((t) => t.path === pathname);
    if (!isRootTab) {
      const tabRoot = findTabRoot(pathname);
      if (tabRoot) {
        tabHistoryRef.current[tabRoot] = pathname;
      }
    }
  }, [location.pathname]);

  const handleTabClick = (e, path, isActive) => {
    if (isActive) {
      e.preventDefault();
      delete tabHistoryRef.current[path];
      window.dispatchEvent(new CustomEvent('potholeping-scroll-reset', { detail: { path } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(path);
    } else {
      navigate(tabHistoryRef.current[path] || path);
    }
  };

  return (
    <nav role="tablist" className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center justify-around safe-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {TABS.map(tab => {
        const active = location.pathname === tab.path ||
          (tab.path !== '/' && location.pathname.startsWith(tab.path + '/'));
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            role="tab"
            aria-selected={active}
            aria-label={tab.label}
            onClick={(e) => handleTabClick(e, tab.path, active)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}