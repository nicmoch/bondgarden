import { useState, useEffect, useCallback } from 'react';
import { client, RELATIONSHIP_TYPES, formatDate, getTrendIcon } from '@/lib/client';
import BambooVisual from '@/components/BambooVisual';
import { ChevronLeft, Plus, X, Check, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Person {
  id: number;
  name: string;
  relationship_type: string;
  avatar_emoji: string;
  is_given_garden: boolean;
  is_archived: boolean;
}

interface RelScore {
  id: number;
  person_id: number;
  balance_score: number;
  health_score: number;
  needs_score: number;
  trend: string;
  last_interaction_date: string;
}

interface Interaction {
  id: number;
  person_id: number;
  sentiment: string;
  intensity: number;
  score: number;
  personal_note: string;
  created_at: string;
}

export default function MyGarden() {
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [scores, setScores] = useState<RelScore[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personInteractions, setPersonInteractions] = useState<Interaction[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('friend');
  const [newEmoji, setNewEmoji] = useState('🌿');

  const checkAuth = useCallback(async () => {
    try {
      const res = await client.auth.me();
      setUser(res?.data || null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [peopleRes, scoresRes] = await Promise.all([
        client.entities.people.query({ query: {}, limit: 100 }),
        client.entities.relationship_scores.query({ query: {}, limit: 100 }),
      ]);
      setPeople(peopleRes?.data?.items || []);
      setScores(scoresRes?.data?.items || []);
    } catch {
      // empty
    }
  };

  const loadPersonInteractions = async (personId: number) => {
    try {
      const res = await client.entities.interactions.query({
        query: { person_id: personId },
        sort: '-created_at',
        limit: 20,
      });
      setPersonInteractions(res?.data?.items || []);
    } catch {
      setPersonInteractions([]);
    }
  };

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
    loadPersonInteractions(person.id);
  };

  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    try {
      await client.entities.people.create({
        data: {
          name: newName.trim(),
          relationship_type: newType,
          avatar_emoji: newEmoji,
          is_given_garden: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
      });
      toast.success(`Added ${newName} to your garden`);
      setNewName('');
      setShowAddPerson(false);
      await loadData();
    } catch {
      toast.error('Failed to add person');
    }
  };

  const getScoreForPerson = (personId: number) => scores.find((s) => s.person_id === personId);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'growing') return <TrendingUp size={14} className="text-[#4CAF50]" />;
    if (trend === 'declining') return <TrendingDown size={14} className="text-[#E57373]" />;
    return <Minus size={14} className="text-[#9CA89E]" />;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#6B7B6E] mb-4">Please sign in to view your garden</p>
          <button onClick={() => client.auth.toLogin()} className="bg-[#2D5A3D] text-white px-6 py-3 rounded-2xl font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Person Detail View
  if (selectedPerson) {
    const score = getScoreForPerson(selectedPerson.id);
    return (
      <div className="min-h-screen bg-[#F8F5F0] pb-24">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setSelectedPerson(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/50">
            <ChevronLeft size={20} className="text-[#6B7B6E]" />
          </button>
          <h2 className="font-semibold text-[#2C3E2D]">{selectedPerson.name}</h2>
        </div>

        {/* Bamboo visualization */}
        <div className="px-5 mb-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 flex flex-col items-center">
            <BambooVisual
              balanceScore={score?.balance_score || 0}
              healthScore={score?.health_score || 0}
              leafDensity={Math.max(1, Math.min(5, Math.round((score?.health_score || 0) + 3)))}
              trend={score?.trend || 'stable'}
              size="lg"
              showLabel={false}
            />
            <div className="mt-4 text-center">
              <span className="text-2xl">{selectedPerson.avatar_emoji}</span>
              <h3 className="font-semibold text-[#2C3E2D] mt-1">{selectedPerson.name}</h3>
              <p className="text-xs text-[#9CA89E] capitalize">{selectedPerson.relationship_type}</p>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="px-5 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4DE]/50 text-center">
              <p className="text-[10px] text-[#9CA89E] uppercase tracking-wide mb-1">Balance</p>
              <p className="text-lg font-bold text-[#2C3E2D]">{score?.balance_score?.toFixed(1) || '0'}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4DE]/50 text-center">
              <p className="text-[10px] text-[#9CA89E] uppercase tracking-wide mb-1">Health</p>
              <p className="text-lg font-bold text-[#2C3E2D]">{score?.health_score?.toFixed(1) || '0'}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#E8E4DE]/50 text-center">
              <p className="text-[10px] text-[#9CA89E] uppercase tracking-wide mb-1">Trend</p>
              <div className="flex items-center justify-center gap-1">
                <TrendIcon trend={score?.trend || 'stable'} />
                <span className="text-xs text-[#6B7B6E] capitalize">{score?.trend || 'stable'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent interactions */}
        <div className="px-5">
          <h3 className="text-sm font-semibold text-[#6B7B6E] mb-3 uppercase tracking-wide">Recent Interactions</h3>
          {personInteractions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 text-center">
              <span className="text-2xl mb-2 block">🍃</span>
              <p className="text-sm text-[#6B7B6E]">No interactions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {personInteractions.map((interaction) => (
                <div key={interaction.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#9CA89E]">{formatDate(interaction.created_at)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                      interaction.score > 0 ? 'bg-green-50 text-green-600' :
                      interaction.score < 0 ? 'bg-red-50 text-red-500' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {interaction.score > 0 ? '+' : ''}{interaction.score}
                    </span>
                  </div>
                  <p className="text-sm text-[#2C3E2D] capitalize">{interaction.sentiment.replace(/_/g, ' ')}</p>
                  {interaction.personal_note && (
                    <p className="text-xs text-[#6B7B6E] mt-1 italic">{interaction.personal_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Garden Overview
  return (
    <div className="min-h-screen bg-[#F8F5F0] pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#2C3E2D]">My Bamboo Garden</h1>
        <p className="text-sm text-[#6B7B6E] mt-1">{people.length} relationship{people.length !== 1 ? 's' : ''} growing</p>
      </div>

      {/* Bamboo forest visualization */}
      {people.length > 0 && (
        <div className="px-5 mb-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8E4DE]/50 overflow-x-auto">
            <div className="flex items-end gap-4 min-w-max justify-center pb-2">
              {people.map((person) => {
                const score = getScoreForPerson(person.id);
                return (
                  <button
                    key={person.id}
                    onClick={() => handleSelectPerson(person)}
                    className="flex flex-col items-center hover:scale-105 transition-transform"
                  >
                    <BambooVisual
                      balanceScore={score?.balance_score || 0}
                      healthScore={score?.health_score || 0}
                      leafDensity={Math.max(1, Math.min(5, Math.round((score?.health_score || 0) + 3)))}
                      trend={score?.trend || 'stable'}
                      size="md"
                      showLabel
                      label={person.name}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* People list */}
      <div className="px-5">
        <h3 className="text-sm font-semibold text-[#6B7B6E] mb-3 uppercase tracking-wide">All Relationships</h3>

        {people.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E8E4DE]/50 text-center">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/b075a731-6f9f-436d-bba0-549726a53814.png"
              alt="New growth"
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 opacity-80"
            />
            <h3 className="font-semibold text-[#2C3E2D] mb-1">Your garden awaits</h3>
            <p className="text-sm text-[#6B7B6E] mb-4">Add people to start growing your relationship garden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {people.map((person) => {
              const score = getScoreForPerson(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => handleSelectPerson(person)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
                >
                  <span className="text-2xl">{person.avatar_emoji || '🌿'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2C3E2D] text-sm">{person.name}</p>
                    <p className="text-xs text-[#9CA89E] capitalize">{person.relationship_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={score?.trend || 'stable'} />
                    <span className="text-xs text-[#6B7B6E]">{getTrendIcon(score?.trend || 'stable')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add person */}
        {showAddPerson ? (
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Person's name"
                className="flex-1 px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] placeholder:text-[#C4BFB8] focus:outline-none"
              />
              <button onClick={handleAddPerson} className="p-2 bg-[#2D5A3D] text-white rounded-xl">
                <Check size={16} />
              </button>
              <button onClick={() => setShowAddPerson(false)} className="p-2 bg-[#F8F5F0] text-[#6B7B6E] rounded-xl">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              {['🌿', '💚', '🌸', '🌻', '🌊', '⭐', '🦋', '🍀'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setNewEmoji(emoji)}
                  className={`text-lg p-1 rounded-lg ${newEmoji === emoji ? 'bg-[#2D5A3D]/10' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] focus:outline-none"
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={() => setShowAddPerson(true)}
            className="w-full mt-3 bg-white rounded-2xl p-4 shadow-sm border border-dashed border-[#D4D0CA] flex items-center justify-center gap-2 text-sm text-[#6B7B6E] hover:border-[#2D5A3D]/30 hover:text-[#2D5A3D] transition-colors"
          >
            <Plus size={16} />
            Add a person
          </button>
        )}
      </div>
    </div>
  );
}
