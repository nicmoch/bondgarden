import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { client, MOODS, formatDate, toISODate } from '@/lib/client';
import BambooVisual from '@/components/BambooVisual';
import { BookOpen, Trees, Heart, Users, Sparkles, LogIn, Settings, ChevronRight, Sun, Moon, Cloud } from 'lucide-react';
import { toast } from 'sonner';

interface Person {
  id: number;
  name: string;
  relationship_type: string;
  avatar_emoji: string;
  is_given_garden: boolean;
}

interface RelScore {
  id: number;
  person_id: number;
  balance_score: number;
  health_score: number;
  needs_score: number;
  trend: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [scores, setScores] = useState<RelScore[]>([]);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await client.auth.me();
      setUser(res?.data || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [peopleRes, scoresRes, journalRes] = await Promise.all([
        client.entities.people.query({ query: {}, limit: 50 }),
        client.entities.relationship_scores.query({ query: {}, limit: 50 }),
        client.entities.journal_entries.query({
          query: { entry_date: toISODate(new Date()) },
          limit: 1,
        }),
      ]);
      setPeople(peopleRes?.data?.items || []);
      setScores(scoresRes?.data?.items || []);
      setTodayEntry(journalRes?.data?.items?.[0] || null);
    } catch {
      // silently fail for empty data
    }
  };

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setUser(null);
    setShowSettings(false);
    toast.success('Logged out successfully');
  };

  const getScoreForPerson = (personId: number) => {
    return scores.find((s) => s.person_id === personId);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun, sub: 'Start your day with reflection' };
    if (hour < 18) return { text: 'Good Afternoon', icon: Cloud, sub: 'How are your connections today?' };
    return { text: 'Good Evening', icon: Moon, sub: 'Time to reflect on your day' };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const todayMood = todayEntry ? MOODS.find((m) => m.value === todayEntry.mood) : null;
  const givenPeople = people.filter((p) => p.is_given_garden && !('is_archived' in p && p.is_archived));
  const topPeople = people.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#2D5A3D] border-t-transparent animate-spin" />
          <p className="text-[#6B7B6E] text-sm">Growing your garden...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated landing
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex flex-col">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <img
            src="https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/ceb2e49d-0c3c-4783-bb39-5e99aa9accec.png"
            alt="Bamboo garden"
            className="w-full h-[50vh] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F8F5F0]" />
          <div className="absolute bottom-8 left-0 right-0 text-center px-6">
            <h1 className="text-3xl font-bold text-[#2C3E2D] mb-2">BondGarden</h1>
            <p className="text-[#6B7B6E] text-base">Nurture your relationships like a garden</p>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-8 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center">
                <Trees size={20} className="text-[#2D5A3D]" />
              </div>
              <h3 className="font-semibold text-[#2C3E2D]">My Bamboo Garden</h3>
            </div>
            <p className="text-sm text-[#6B7B6E] leading-relaxed">Watch your relationships grow as bamboo. Each stalk reflects how you feel about each connection.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#D4A574]/20 flex items-center justify-center">
                <Heart size={20} className="text-[#D4A574]" />
              </div>
              <h3 className="font-semibold text-[#2C3E2D]">Given Garden</h3>
            </div>
            <p className="text-sm text-[#6B7B6E] leading-relaxed">Track how well you&apos;re meeting the emotional needs of your 5 closest people.</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#8FBC8F]/20 flex items-center justify-center">
                <Users size={20} className="text-[#4A7C59]" />
              </div>
              <h3 className="font-semibold text-[#2C3E2D]">Shared Garden</h3>
            </div>
            <p className="text-sm text-[#6B7B6E] leading-relaxed">See how both sides feel about the relationship. Discover perception gaps with care.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-12">
          <button
            onClick={handleLogin}
            className="w-full bg-[#2D5A3D] text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#2D5A3D]/20 hover:bg-[#234A31] transition-colors"
          >
            <LogIn size={20} />
            Begin Your Garden
          </button>
        </div>
      </div>
    );
  }

  // Authenticated Home
  return (
    <div className="min-h-screen bg-[#F8F5F0] pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GreetingIcon size={18} className="text-[#D4A574]" />
            <span className="text-sm text-[#6B7B6E]">{greeting.text}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2C3E2D]">BondGarden</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#E8E4DE] flex items-center justify-center"
        >
          <Settings size={18} className="text-[#6B7B6E]" />
        </button>
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div className="mx-5 mb-4 bg-white rounded-2xl p-4 shadow-md border border-[#E8E4DE] animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#2C3E2D]">Account</span>
            <span className="text-xs text-[#6B7B6E]">Logged in</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-red-500 py-2 px-3 rounded-xl hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Today's Journal Card */}
      <div className="px-5 mb-4">
        <button
          onClick={() => navigate('/journal')}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#2D5A3D]" />
              <span className="font-semibold text-[#2C3E2D]">Today&apos;s Journal</span>
            </div>
            <span className="text-xs text-[#9CA89E]">{formatDate(new Date())}</span>
          </div>
          {todayEntry ? (
            <div className="flex items-center gap-3">
              {todayMood && <span className="text-2xl">{todayMood.emoji}</span>}
              <p className="text-sm text-[#6B7B6E] line-clamp-2 flex-1">{todayEntry.content}</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8F5F0] flex items-center justify-center">
                <span className="text-lg">✍️</span>
              </div>
              <div>
                <p className="text-sm text-[#2C3E2D] font-medium">How was your day?</p>
                <p className="text-xs text-[#9CA89E]">Tap to write your journal entry</p>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Reflection Highlight */}
      <div className="px-5 mb-4">
        <div className="bg-gradient-to-br from-[#2D5A3D]/5 to-[#8FBC8F]/10 rounded-2xl p-5 border border-[#2D5A3D]/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#D4A574]" />
            <span className="text-xs font-medium text-[#D4A574] uppercase tracking-wide">Daily Insight</span>
          </div>
          {people.length > 0 ? (
            <p className="text-sm text-[#2C3E2D] leading-relaxed">
              You have {people.length} relationship{people.length !== 1 ? 's' : ''} in your garden.
              {givenPeople.length > 0 && ` ${givenPeople.length} people in your Given Garden need your attention.`}
              {' '}Take a moment to reflect on your connections today.
            </p>
          ) : (
            <p className="text-sm text-[#2C3E2D] leading-relaxed">
              Your garden is ready to grow. Start by writing a journal entry and tagging the people in your life. 🌱
            </p>
          )}
        </div>
      </div>

      {/* Garden Overview */}
      <div className="px-5 mb-4">
        <h2 className="text-lg font-semibold text-[#2C3E2D] mb-3">Your Gardens</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/my-garden')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-2">
              <Trees size={20} className="text-[#2D5A3D]" />
            </div>
            <p className="text-xs font-semibold text-[#2C3E2D]">My Bamboo</p>
            <p className="text-[10px] text-[#9CA89E] mt-0.5">{people.length} people</p>
          </button>

          <button
            onClick={() => navigate('/given-garden')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D4A574]/15 flex items-center justify-center mx-auto mb-2">
              <Heart size={20} className="text-[#D4A574]" />
            </div>
            <p className="text-xs font-semibold text-[#2C3E2D]">Given</p>
            <p className="text-[10px] text-[#9CA89E] mt-0.5">{givenPeople.length}/5 active</p>
          </button>

          <button
            onClick={() => navigate('/shared-garden')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8FBC8F]/20 flex items-center justify-center mx-auto mb-2">
              <Users size={20} className="text-[#4A7C59]" />
            </div>
            <p className="text-xs font-semibold text-[#2C3E2D]">Shared</p>
            <p className="text-[10px] text-[#9CA89E] mt-0.5">Connect</p>
          </button>
        </div>
      </div>

      {/* Top Relationships Preview */}
      {topPeople.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#2C3E2D]">Garden Preview</h2>
            <button onClick={() => navigate('/my-garden')} className="text-xs text-[#2D5A3D] font-medium flex items-center gap-0.5">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-end justify-around">
              {topPeople.map((person) => {
                const score = getScoreForPerson(person.id);
                return (
                  <div key={person.id} className="flex flex-col items-center">
                    <BambooVisual
                      balanceScore={score?.balance_score || 0}
                      healthScore={score?.health_score || 0}
                      leafDensity={Math.max(1, Math.min(5, Math.round((score?.health_score || 0) + 3)))}
                      trend={score?.trend || 'stable'}
                      size="sm"
                      showLabel
                      label={person.name}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-semibold text-[#2C3E2D] mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/journal')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center">
              <BookOpen size={18} className="text-[#2D5A3D]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#2C3E2D]">Write in Journal</p>
              <p className="text-xs text-[#9CA89E]">Record your thoughts and interactions</p>
            </div>
            <ChevronRight size={16} className="text-[#9CA89E]" />
          </button>

          <button
            onClick={() => navigate('/my-garden')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-[#4A7C59]/10 flex items-center justify-center">
              <Trees size={18} className="text-[#4A7C59]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#2C3E2D]">Visit Your Garden</p>
              <p className="text-xs text-[#9CA89E]">See how your relationships are growing</p>
            </div>
            <ChevronRight size={16} className="text-[#9CA89E]" />
          </button>
        </div>
      </div>
    </div>
  );
}
