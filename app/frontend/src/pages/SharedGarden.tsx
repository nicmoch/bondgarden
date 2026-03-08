import { useState, useEffect, useCallback } from 'react';
import { client, formatDate } from '@/lib/client';
import BambooVisual from '@/components/BambooVisual';
import { ChevronLeft, Copy, Check, Eye, EyeOff, MessageCircle, Sparkles, Users, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface SharedRel {
  id: number;
  person_id: number;
  partner_user_id: string;
  invite_code: string;
  status: string;
  sharing_mode: string;
}

interface SharedNote {
  id: number;
  shared_relationship_id: number;
  interaction_id: number;
  note_text: string;
  is_ai_suggested: boolean;
  created_at: string;
}

interface Person {
  id: number;
  name: string;
  avatar_emoji: string;
  relationship_type: string;
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

export default function SharedGarden() {
  const [user, setUser] = useState<any>(null);
  const [sharedRels, setSharedRels] = useState<SharedRel[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [scores, setScores] = useState<RelScore[]>([]);
  const [selectedRel, setSelectedRel] = useState<SharedRel | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedPersonForInvite, setSelectedPersonForInvite] = useState<number | null>(null);
  const [newNote, setNewNote] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
      const [sharedRes, notesRes, peopleRes, scoresRes] = await Promise.all([
        client.entities.shared_relationships.query({ query: {}, limit: 50 }),
        client.entities.shared_notes.query({ query: {}, sort: '-created_at', limit: 100 }),
        client.entities.people.query({ query: {}, limit: 100 }),
        client.entities.relationship_scores.query({ query: {}, limit: 100 }),
      ]);
      setSharedRels(sharedRes?.data?.items || []);
      setSharedNotes(notesRes?.data?.items || []);
      setPeople(peopleRes?.data?.items || []);
      setScores(scoresRes?.data?.items || []);
    } catch {
      // empty
    }
  };

  const getPersonById = (id: number) => people.find((p) => p.id === id);
  const getScoreForPerson = (personId: number) => scores.find((s) => s.person_id === personId);
  const getNotesForRel = (relId: number) => sharedNotes.filter((n) => n.shared_relationship_id === relId);

  const givenPeople = people.filter((p) => p.is_given_garden);
  const sharedPersonIds = sharedRels.map((r) => r.person_id);
  const availableForInvite = givenPeople.filter((p) => !sharedPersonIds.includes(p.id));

  const handleCreateInvite = async () => {
    if (!selectedPersonForInvite) return;
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await client.entities.shared_relationships.create({
        data: {
          person_id: selectedPersonForInvite,
          partner_user_id: '',
          invite_code: code,
          status: 'pending',
          sharing_mode: 'share_all',
          created_at: new Date().toISOString(),
        },
      });
      toast.success('Invite created! Share the code with them.');
      setShowInvite(false);
      setSelectedPersonForInvite(null);
      await loadData();
    } catch {
      toast.error('Failed to create invite');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleSharingMode = async (rel: SharedRel) => {
    const newMode = rel.sharing_mode === 'share_all' ? 'share_only_leaves' : 'share_all';
    try {
      await client.entities.shared_relationships.update({
        id: rel.id,
        data: { sharing_mode: newMode },
      });
      toast.success(`Sharing mode: ${newMode === 'share_all' ? 'Share All' : 'Share Only Leaves'}`);
      await loadData();
      if (selectedRel?.id === rel.id) {
        setSelectedRel({ ...rel, sharing_mode: newMode });
      }
    } catch {
      toast.error('Failed to update sharing mode');
    }
  };

  const handleAddSharedNote = async (relId: number) => {
    if (!newNote.trim()) return;
    try {
      await client.entities.shared_notes.create({
        data: {
          shared_relationship_id: relId,
          interaction_id: 0,
          note_text: newNote.trim(),
          is_ai_suggested: false,
          created_at: new Date().toISOString(),
        },
      });
      toast.success('Shared note added');
      setNewNote('');
      await loadData();
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleAiSuggest = async () => {
    if (!newNote.trim()) {
      toast.error('Write a thought first, then AI will suggest a constructive version');
      return;
    }
    setAiSuggesting(true);
    try {
      const response = await client.ai.gentxt({
        messages: [
          {
            role: 'system',
            content: 'You are an emotionally intelligent relationship coach. Rewrite the user\'s private thought into a constructive, kind, and honest shared note. Keep it brief (1-2 sentences). Maintain the emotional truth but make it safe to share.',
          },
          {
            role: 'user',
            content: `Rewrite this private thought into a constructive shared note:\n"${newNote}"\n\nReturn ONLY the rewritten note, nothing else.`,
          },
        ],
        model: 'deepseek-v3.2',
        stream: false,
      });
      const suggestion = response?.data?.content?.trim() || newNote;
      setNewNote(suggestion);
      toast.success('AI suggestion applied. Feel free to edit before sharing.');
    } catch {
      toast.error('AI suggestion failed');
    } finally {
      setAiSuggesting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#6B7B6E] mb-4">Please sign in to view your Shared Garden</p>
          <button onClick={() => client.auth.toLogin()} className="bg-[#2D5A3D] text-white px-6 py-3 rounded-2xl font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Shared relationship detail
  if (selectedRel) {
    const person = getPersonById(selectedRel.person_id);
    const score = getScoreForPerson(selectedRel.person_id);
    const notes = getNotesForRel(selectedRel.id);
    const isShareAll = selectedRel.sharing_mode === 'share_all';

    return (
      <div className="min-h-screen bg-[#F8F5F0] pb-24">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setSelectedRel(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/50">
            <ChevronLeft size={20} className="text-[#6B7B6E]" />
          </button>
          <h2 className="font-semibold text-[#2C3E2D]">Shared with {person?.name || 'Unknown'}</h2>
        </div>

        {/* Dual bamboo comparison */}
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
              <div className="flex flex-col items-center justify-center px-4">
                <div className="w-8 h-8 rounded-full bg-[#F8F5F0] flex items-center justify-center mb-1">
                  <Users size={14} className="text-[#9CA89E]" />
                </div>
                <span className="text-[10px] text-[#9CA89E]">
                  {selectedRel.status === 'accepted' ? 'Connected' : 'Pending'}
                </span>
              </div>
              <div className="text-center">
                <BambooVisual
                  balanceScore={0}
                  healthScore={0}
                  leafDensity={2}
                  trend="stable"
                  size="md"
                  showLabel
                  label="Their Bamboo"
                />
                {selectedRel.status !== 'accepted' && (
                  <p className="text-[10px] text-[#9CA89E] mt-1">Awaiting</p>
                )}
              </div>
            </div>

            {/* Perception gap indicator */}
            {selectedRel.status === 'accepted' && (
              <div className="mt-4 pt-4 border-t border-[#E8E4DE]">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-[#E8E4DE] overflow-hidden">
                    <div className="h-full bg-[#2D5A3D] rounded-full transition-all" style={{ width: '60%' }} />
                  </div>
                  <span className="text-[10px] text-[#6B7B6E] shrink-0">Alignment</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sharing mode toggle */}
        <div className="px-5 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isShareAll ? <Eye size={16} className="text-[#2D5A3D]" /> : <EyeOff size={16} className="text-[#D4A574]" />}
                <div>
                  <p className="text-sm font-medium text-[#2C3E2D]">
                    {isShareAll ? 'Share All' : 'Share Only Leaves'}
                  </p>
                  <p className="text-[10px] text-[#9CA89E]">
                    {isShareAll ? 'Bamboo growth + shared notes visible' : 'Only bamboo growth visible'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleSharingMode(selectedRel)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isShareAll ? 'bg-[#2D5A3D]' : 'bg-[#D4D0CA]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    isShareAll ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Invite code for pending */}
        {selectedRel.status === 'pending' && (
          <div className="px-5 mb-4">
            <div className="bg-gradient-to-br from-[#2D5A3D]/5 to-[#8FBC8F]/10 rounded-2xl p-4 border border-[#2D5A3D]/10">
              <p className="text-xs text-[#6B7B6E] mb-2">Share this invite code with {person?.name}:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-4 py-2.5 rounded-xl text-center font-mono text-lg text-[#2C3E2D] tracking-widest">
                  {selectedRel.invite_code}
                </code>
                <button
                  onClick={() => handleCopyCode(selectedRel.invite_code)}
                  className="p-2.5 bg-[#2D5A3D] text-white rounded-xl"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shared notes section */}
        {isShareAll && (
          <div className="px-5">
            <h3 className="text-sm font-semibold text-[#6B7B6E] mb-3 uppercase tracking-wide">Shared Notes</h3>

            {notes.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 text-center mb-3">
                <MessageCircle size={24} className="text-[#D4A574] mx-auto mb-2" />
                <p className="text-sm text-[#6B7B6E]">No shared notes yet. Share a thought safely.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
                    <p className="text-sm text-[#2C3E2D] leading-relaxed">{note.note_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-[#9CA89E]">{formatDate(note.created_at)}</span>
                      {note.is_ai_suggested && (
                        <span className="text-[10px] text-[#D4A574] flex items-center gap-0.5">
                          <Sparkles size={10} /> AI-assisted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add shared note */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a thought to share safely..."
                className="w-full min-h-[80px] text-sm text-[#2C3E2D] placeholder:text-[#C4BFB8] resize-none focus:outline-none leading-relaxed bg-transparent"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAiSuggest}
                  disabled={aiSuggesting}
                  className="flex items-center gap-1 text-xs text-[#D4A574] px-3 py-1.5 rounded-xl bg-[#D4A574]/10 hover:bg-[#D4A574]/20 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  {aiSuggesting ? 'Suggesting...' : 'AI Rewrite'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleAddSharedNote(selectedRel.id)}
                  disabled={!newNote.trim()}
                  className="flex items-center gap-1 text-xs text-white px-4 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#234A31] transition-colors disabled:opacity-50"
                >
                  Share Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Overview
  return (
    <div className="min-h-screen bg-[#F8F5F0] pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#2C3E2D]">Shared Garden</h1>
        <p className="text-sm text-[#6B7B6E] mt-1">Mutual relationship views with connected people</p>
      </div>

      {/* Shared relationships */}
      <div className="px-5 mb-4">
        {sharedRels.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E8E4DE]/50 text-center">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/1008349/2026-03-08/5ecd9c6c-e0ee-4678-86da-6125945081c2.png"
              alt="Zen garden path"
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 opacity-80"
            />
            <h3 className="font-semibold text-[#2C3E2D] mb-1">Walk together</h3>
            <p className="text-sm text-[#6B7B6E] mb-4">
              Invite someone from your Given Garden to share a mutual relationship view
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sharedRels.map((rel) => {
              const person = getPersonById(rel.person_id);
              return (
                <button
                  key={rel.id}
                  onClick={() => setSelectedRel(rel)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{person?.avatar_emoji || '🌿'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C3E2D] text-sm">{person?.name || 'Unknown'}</p>
                      <p className="text-xs text-[#9CA89E] capitalize">
                        {rel.status} · {rel.sharing_mode === 'share_all' ? 'Share All' : 'Leaves Only'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      rel.status === 'accepted' ? 'bg-[#4CAF50]' : 'bg-[#FFB74D]'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Invite flow */}
        {showInvite ? (
          <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#6B7B6E]">Choose from Given Garden</span>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-[#F8F5F0]">
                <X size={14} className="text-[#9CA89E]" />
              </button>
            </div>
            {availableForInvite.length === 0 ? (
              <p className="text-xs text-[#9CA89E] text-center py-2">
                {givenPeople.length === 0 ? 'Add people to Given Garden first' : 'All Given Garden people already invited'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {availableForInvite.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      setSelectedPersonForInvite(person.id);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-left ${
                      selectedPersonForInvite === person.id ? 'bg-[#2D5A3D]/10 border border-[#2D5A3D]/20' : 'hover:bg-[#F8F5F0]'
                    }`}
                  >
                    <span>{person.avatar_emoji || '🌿'}</span>
                    <span className="text-sm text-[#2C3E2D] flex-1">{person.name}</span>
                    {selectedPersonForInvite === person.id && <Check size={14} className="text-[#2D5A3D]" />}
                  </button>
                ))}
              </div>
            )}
            {selectedPersonForInvite && (
              <button
                onClick={handleCreateInvite}
                className="w-full mt-3 bg-[#2D5A3D] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#234A31] transition-colors"
              >
                Create Invite
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            className="w-full mt-3 bg-white rounded-2xl p-4 shadow-sm border border-dashed border-[#D4D0CA] flex items-center justify-center gap-2 text-sm text-[#6B7B6E] hover:border-[#2D5A3D]/30 hover:text-[#2D5A3D] transition-colors"
          >
            <Plus size={16} />
            Invite someone to Shared Garden
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="px-5">
        <div className="bg-gradient-to-br from-[#2D5A3D]/5 to-[#8FBC8F]/10 rounded-2xl p-5 border border-[#2D5A3D]/10">
          <h3 className="text-sm font-semibold text-[#2C3E2D] mb-3">How Shared Garden Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#2D5A3D]">1</span>
              </div>
              <p className="text-xs text-[#6B7B6E] leading-relaxed">Invite someone from your Given Garden by sharing a unique code</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#2D5A3D]">2</span>
              </div>
              <p className="text-xs text-[#6B7B6E] leading-relaxed">They create a BondGarden account and accept your invite</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#2D5A3D]">3</span>
              </div>
              <p className="text-xs text-[#6B7B6E] leading-relaxed">See both bamboo stalks side by side and discover perception gaps with care</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
