import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Trees, Heart, Users } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/my-garden', label: 'Garden', icon: Trees },
  { path: '/given-garden', label: 'Given', icon: Heart },
  { path: '/shared-garden', label: 'Shared', icon: Users },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#E8E4DE] safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-[#2D5A3D] scale-105'
                  : 'text-[#9CA89E] hover:text-[#6B7B6E]'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all duration-300"
              />
              <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#2D5A3D] mt-0.5 animate-in fade-in duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
