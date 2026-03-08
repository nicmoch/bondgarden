import { useState, useEffect, useCallback } from 'react';
import { client, formatDate } from '@/lib/client';
import BambooVisual from '@/components/BambooVisual';
import { ChevronLeft, Plus, X, Check, Archive, RotateCcw, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Person {
  id: number;
  name: string;
  relationship_type: string;
  avatar_emoji: string;
  is_given_garden: boolean;
  is_archived: boolean;
}

interface Need {
  id: number;
  name: string;
  description: string;
  icon: string;
  is_default: boolean;
}

interface PersonNeed {
  id: number;
  person_id: number;
  need_id: number;
  custom_need_name: string;
  priority: number;
}

interface RelScore {
  id: number;
  person_id: number;
  balance_score: number;
  health_score: number;
  needs_score: number;
  trend: string;
}

export default function GivenGarden() {
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [scores, setScores] = useState<RelScore[]>([]);
  const [needsCatalog, setNeedsCatalog] = useState<Need[]>([]);
  const [personNeeds, setPersonNeeds] = useState<PersonNeed[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [addingNeed, setAddingNeed] = useState(false);

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
      const [peopleRes, scoresRes, needsRes, personNeedsRes] = await Promise.all([
        client.entities.people.query({ query: {}, limit: 100 }),
        client.entities.relationship_scores.query({ query: {}, limit: 100 }),
        client.entities.needs_catalog.query({ query: {}, limit: 50 }),
        client.entities.person_needs.query({ query: {}, limit: 200 }),
      ]);
      const allP = peopleRes?.data?.items || [];
      setAllPeople(allP);
      setPeople(allP.filter((p: Person) => p.is_given_garden));
      setScores(scoresRes?.data?.items || []);
      setNeedsCatalog(needsRes?.data?.items || []);
      setPersonNeeds(personNeedsRes?.data?.items || []);
    } catch {
      // empty
    }
  };

  const activePeople = people.filter((p) => !p.is_archived);
  const archivedPeople = people.filter((p) => p.is_archived);
  const availablePeople = allPeople.filter((p) => !p.is_given_garden);

  const getScoreForPerson = (personId: number) => scores.find((s) => s.person_id === personId);
  const getNeedsForPerson = (personId: number) => personNeeds.filter((pn) => pn.person_id === personId);
  const getNeedName = (pn: PersonNeed) => {
    if (pn.custom_need_name) return pn.custom_need_name;
    const need = needsCatalog.find((n) => n.id === pn.need_id);
    return need?.name || 'Unknown';
  };
  const getNeedIcon = (pn: PersonNeed) => {
    if (pn.custom_need_name) return '✨';
    const need = needsCatalog.find((n) => n.id === pn.need_id);
    return need?.icon || '💫';
  };

  const handleAddToGiven = async (person: Person) => {
    if (activePeople.length >= 5) {
      toast.error('Maximum 5 active people. Archive someone first.');
      return;
    }
    try {
      await client.entities.people.update({
        id: person.id,
        data: { is_given_garden: true, is_archived: false },
      });
      toast.success(`${person.name} added to Given Garden`);
      setShowAddFlow(false);
      await loadData();
    } catch {
      toast.error('Failed to add person');
    }
  };

  const handleArchive = async (person: Person) => {
    try {
      await client.entities.people.update({
        id: person.id,
        data: { is_archived: true },
      });
      toast.success(`${person.name} archived`);
      if (selectedPerson?.id === person.id) setSelectedPerson(null);
      await loadData();
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleRestore = async (person: Person) => {
    if (activePeople.length >= 5) {
      toast.error('Maximum 5 active people. Archive someone first.');
      return;
    }
    try {
      await client.entities.people.update({
        id: person.id,
        data: { is_archived: false },
      });
      toast.success(`${person.name} restored`);
      await loadData();
    } catch {
      toast.error('Failed to restore');
    }
  };

  const handleAddNeed = async (personId: number, needId: number) => {
    try {
      await client.entities.person_needs.create({
        data: {
          person_id: personId,
          need_id: needId,
          custom_need_name: '',
          priority: getNeedsForPerson(personId).length + 1,
          created_at: new Date().toISOString(),
        },
      });
      toast.success('Need added');
      await loadData();
    } catch {
      toast.error('Failed to add need');
    }
  };

  const handleRemoveNeed = async (personNeedId: number) => {
    try {
      await client.entities.person_needs.delete({ id: personNeedId });
      toast.success('Need removed');
      await loadData();
    } catch {
      toast.error('Failed to remove need');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#6B7B6E] mb-4">Please sign in to view your Given Garden</p>
          <button onClick={() => client.auth.toLogin()} className="bg-[#2D5A3D] text-white px-6 py-3 rounded-2xl font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Person detail
  if (selectedPerson) {
    const score = getScoreForPerson(selectedPerson.id);
    const needs = getNeedsForPerson(selectedPerson.id);
    const assignedNeedIds = needs.map((n) => n.need_id);
    const availableNeeds = needsCatalog.filter((n) => !assignedNeedIds.includes(n.id));

    return (
      <div className="min-h-screen bg-[#F8F5F0] pb-24">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedPerson(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/50">
              <ChevronLeft size={20} className="text-[#6B7B6E]" />
            </button>
            <h2 className="font-semibold text-[#2C3E2D]">{selectedPerson.name}</h2>
          </div>
          <button
            onClick={() => handleArchive(selectedPerson)}
            className="flex items-center gap-1 text-xs text-[#9CA89E] px-3 py-1.5 rounded-xl hover:bg-white/50"
          >
            <Archive size={14} />
            Archive
          </button>
        </div>

        {/* Dual bamboo view */}
        <div className="px-5 mb-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-end justify-around">
              <div className="text-center">
                <BambooVisual
                  balanceScore={score?.balance_score || 0}
                  healthScore={score?.health_score || 0}
                  leafDensity={Math.max(1, Math.min(5, Math.round((score?.health_score || 0) + 3)))}
                  trend={score?.trend || 'stable'}
                  size="md"
                  showLabel
                  label="My Bamboo"
                />
              </div>
              <div className="text-center">
                <BambooVisual
                  balanceScore={score?.needs_score || 0}
                  healthScore={score?.needs_score || 0}
                  leafDensity={Math.max(1, Math.min(5, Math.round((score?.needs_score || 0) + 3)))}
                  trend={score?.needs_score && score.needs_score > 0 ? 'growing' : score?.needs_score && score.needs_score < 0 ? 'declining' : 'stable'}
                  size="md"
                  showLabel
                  label="Their Needs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Needs */}
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#6B7B6E] uppercase tracking-wide">Their Expressed Needs</h3>
          </div>

          {needs.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 text-center">
              <Heart size={24} className="text-[#D4A574] mx-auto mb-2" />
              <p className="text-sm text-[#6B7B6E]">No needs defined yet. Add what matters to them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needs.map((pn) => (
                <div key={pn.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 flex items-center gap-3">
                  <span className="text-lg">{getNeedIcon(pn)}</span>
                  <span className="flex-1 text-sm font-medium text-[#2C3E2D]">{getNeedName(pn)}</span>
                  <button
                    onClick={() => handleRemoveNeed(pn.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-[#9CA89E] hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add need */}
          {addingNeed ? (
            <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7B6E]">Select a need</span>
                <button onClick={() => setAddingNeed(false)} className="p-1 rounded-lg hover:bg-[#F8F5F0]">
                  <X size={14} className="text-[#9CA89E]" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableNeeds.map((need) => (
                  <button
                    key={need.id}
                    onClick={() => {
                      handleAddNeed(selectedPerson.id, need.id);
                      setAddingNeed(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] hover:bg-[#2D5A3D]/10 transition-colors"
                  >
                    <span>{need.icon}</span>
                    <span>{need.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNeed(true)}
              className="w-full mt-3 bg-white rounded-2xl p-3 shadow-sm border border-dashed border-[#D4D0CA] flex items-center justify-center gap-2 text-xs text-[#6B7B6E] hover:border-[#2D5A3D]/30 hover:text-[#2D5A3D] transition-colors"
            >
              <Plus size={14} />
              Add a need
            </button>
          )}
        </div>
      </div>
    );
  }

  // Garden overview
  return (
    <div className="min-h-screen bg-[#F8F5F0] pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#2C3E2D]">Given Garden</h1>
        <p className="text-sm text-[#6B7B6E] mt-1">
          {activePeople.length}/5 active · Track what you give to those who matter most
        </p>
      </div>

      {/* Active people */}
      <div className="px-5 mb-4">
        {activePeople.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E8E4DE]/50 text-center">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/7bddb137-c53b-436d-83d5-16d60184e927.png"
              alt="Watercolor bamboo"
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 opacity-80"
            />
            <h3 className="font-semibold text-[#2C3E2D] mb-1">Start giving intentionally</h3>
            <p className="text-sm text-[#6B7B6E] mb-4">Choose up to 5 people whose needs you want to track and nurture</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePeople.map((person) => {
              const score = getScoreForPerson(person.id);
              const needs = getNeedsForPerson(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{person.avatar_emoji || '🌿'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C3E2D] text-sm">{person.name}</p>
                      <p className="text-xs text-[#9CA89E]">
                        {needs.length} need{needs.length !== 1 ? 's' : ''} tracked
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-[#6B7B6E]">
                        Needs: {score?.needs_score?.toFixed(1) || '0'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add person to Given Garden */}
        {activePeople.length < 5 && (
          <>
            {showAddFlow ? (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#6B7B6E]">Choose from your garden</span>
                  <button onClick={() => setShowAddFlow(false)} className="p-1 rounded-lg hover:bg-[#F8F5F0]">
                    <X size={14} className="text-[#9CA89E]" />
                  </button>
                </div>
                {availablePeople.length === 0 ? (
                  <p className="text-xs text-[#9CA89E] text-center py-2">
                    Add people in My Bamboo Garden first
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {availablePeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleAddToGiven(person)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#F8F5F0] transition-colors text-left"
                      >
                        <span>{person.avatar_emoji || '🌿'}</span>
                        <span className="text-sm text-[#2C3E2D]">{person.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAddFlow(true)}
                className="w-full mt-3 bg-white rounded-2xl p-4 shadow-sm border border-dashed border-[#D4D0CA] flex items-center justify-center gap-2 text-sm text-[#6B7B6E] hover:border-[#2D5A3D]/30 hover:text-[#2D5A3D] transition-colors"
              >
                <Plus size={16} />
                Add person ({activePeople.length}/5)
              </button>
            )}
          </>
        )}
      </div>

      {/* Archived */}
      {archivedPeople.length > 0 && (
        <div className="px-5">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 mb-3"
          >
            <Archive size={14} className="text-[#9CA89E]" />
            <span className="text-sm font-semibold text-[#9CA89E]">Archived ({archivedPeople.length})</span>
          </button>
          {showArchived && (
            <div className="space-y-2">
              {archivedPeople.map((person) => (
                <div key={person.id} className="bg-white/60 rounded-2xl p-4 border border-[#E8E4DE]/30 flex items-center gap-3">
                  <span className="text-xl opacity-50">{person.avatar_emoji || '🌿'}</span>
                  <div className="flex-1">
                    <p className="text-sm text-[#6B7B6E]">{person.name}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(person)}
                    className="flex items-center gap-1 text-xs text-[#2D5A3D] px-3 py-1.5 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
