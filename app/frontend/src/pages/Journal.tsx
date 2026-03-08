import { useState, useEffect, useCallback } from 'react';
import { client, MOODS, SENTIMENTS, SENTIMENT_SCORES, toISODate, formatDate } from '@/lib/client';
import { ChevronLeft, ChevronRight, Save, Sparkles, X, Plus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Person {
  id: number;
  name: string;
  avatar_emoji: string;
  relationship_type: string;
  is_given_garden: boolean;
}

interface DetectedInteraction {
  person: Person;
  sentiment: string;
  intensity: number;
  note: string;
  ignored: boolean;
}

type ViewMode = 'calendar' | 'editor' | 'review';

export default function Journal() {
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedInteractions, setDetectedInteractions] = useState<DetectedInteraction[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonType, setNewPersonType] = useState('friend');

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
  }, [user, currentMonth]);

  const loadData = async () => {
    try {
      const [entriesRes, peopleRes] = await Promise.all([
        client.entities.journal_entries.query({ query: {}, sort: '-entry_date', limit: 100 }),
        client.entities.people.query({ query: {}, limit: 100 }),
      ]);
      setEntries(entriesRes?.data?.items || []);
      setPeople(peopleRes?.data?.items || []);
    } catch {
      // empty
    }
  };

  const openEditor = (date: Date) => {
    setSelectedDate(date);
    const existing = entries.find((e) => e.entry_date === toISODate(date));
    if (existing) {
      setEditingEntry(existing);
      setContent(existing.content || '');
      setMood(existing.mood || '');
    } else {
      setEditingEntry(null);
      setContent('');
      setMood('');
    }
    setDetectedInteractions([]);
    setViewMode('editor');
  };

  const handleSaveEntry = async () => {
    if (!content.trim()) {
      toast.error('Please write something first');
      return;
    }
    setSaving(true);
    try {
      const moodObj = MOODS.find((m) => m.value === mood);
      const data = {
        entry_date: toISODate(selectedDate),
        content: content.trim(),
        mood: mood || 'neutral',
        mood_score: moodObj?.score || 5,
        updated_at: new Date().toISOString(),
      };

      if (editingEntry) {
        await client.entities.journal_entries.update({ id: editingEntry.id, data });
      } else {
        const createData = { ...data, created_at: new Date().toISOString() };
        await client.entities.journal_entries.create({ data: createData });
      }
      toast.success('Journal saved');
      await loadData();
      // Move to interaction review
      await analyzeInteractions();
    } catch {
      toast.error('Failed to save journal');
    } finally {
      setSaving(false);
    }
  };

  const analyzeInteractions = async () => {
    setAnalyzing(true);
    try {
      // Use AI to detect people and sentiment
      const peopleNames = people.map((p) => p.name).join(', ');
      const prompt = `Analyze this journal entry and detect mentioned people and their interaction sentiment.

Known people: ${peopleNames || 'None yet'}

Journal entry:
"${content}"

For each person mentioned (by name or reference), return a JSON array with:
- name: the person's name
- sentiment: one of [very_positive, positive, slightly_positive, neutral, slightly_negative, negative, very_negative]
- intensity: 1-5 scale

If no people are mentioned, return an empty array [].
Return ONLY the JSON array, no other text.`;

      const response = await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'You are an emotional intelligence analyst. Detect people and sentiment from journal entries. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        model: 'deepseek-v3.2',
        stream: false,
      });

      const text = response?.data?.content || '[]';
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const detected = JSON.parse(jsonMatch[0]);
        const interactions: DetectedInteraction[] = detected.map((d: any) => {
          const existingPerson = people.find(
            (p) => p.name.toLowerCase() === d.name?.toLowerCase()
          );
          return {
            person: existingPerson || { id: 0, name: d.name || 'Unknown', avatar_emoji: '🌿', relationship_type: 'other', is_given_garden: false },
            sentiment: d.sentiment || 'neutral',
            intensity: Math.min(5, Math.max(1, d.intensity || 3)),
            note: '',
            ignored: false,
          };
        });
        setDetectedInteractions(interactions);
      }
    } catch {
      // AI failed, allow manual entry
      setDetectedInteractions([]);
    } finally {
      setAnalyzing(false);
      setViewMode('review');
    }
  };

  const handleSaveInteractions = async () => {
    setSaving(true);
    try {
      const entry = entries.find((e) => e.entry_date === toISODate(selectedDate));
      if (!entry) {
        toast.error('No journal entry found');
        setSaving(false);
        return;
      }

      for (const interaction of detectedInteractions) {
        if (interaction.ignored) continue;

        let personId = interaction.person.id;

        // Create person if new
        if (personId === 0) {
          const personRes = await client.entities.people.create({
            data: {
              name: interaction.person.name,
              relationship_type: interaction.person.relationship_type || 'other',
              avatar_emoji: '🌿',
              is_given_garden: false,
              is_archived: false,
              created_at: new Date().toISOString(),
            },
          });
          personId = personRes?.data?.id;
          if (!personId) continue;
        }

        // Create interaction
        await client.entities.interactions.create({
          data: {
            journal_entry_id: entry.id,
            person_id: personId,
            sentiment: interaction.sentiment,
            intensity: interaction.intensity,
            score: SENTIMENT_SCORES[interaction.sentiment] || 0,
            personal_note: interaction.note || '',
            is_ignored: false,
            created_at: new Date().toISOString(),
          },
        });

        // Update or create relationship score
        const existingScores = await client.entities.relationship_scores.query({
          query: { person_id: personId },
          limit: 1,
        });
        const existingScore = existingScores?.data?.items?.[0];
        const newScore = SENTIMENT_SCORES[interaction.sentiment] || 0;

        if (existingScore) {
          const newBalance = (existingScore.balance_score || 0) + newScore;
          const newHealth = newScore * 1.0 + (existingScore.health_score || 0) * 0.6;
          await client.entities.relationship_scores.update({
            id: existingScore.id,
            data: {
              balance_score: Math.round(newBalance * 100) / 100,
              health_score: Math.round(newHealth * 100) / 100,
              trend: newScore > 0 ? 'growing' : newScore < 0 ? 'declining' : 'stable',
              last_interaction_date: toISODate(selectedDate),
              updated_at: new Date().toISOString(),
            },
          });
        } else {
          await client.entities.relationship_scores.create({
            data: {
              person_id: personId,
              balance_score: newScore,
              health_score: newScore,
              needs_score: 0,
              trend: newScore > 0 ? 'growing' : newScore < 0 ? 'declining' : 'stable',
              last_interaction_date: toISODate(selectedDate),
              updated_at: new Date().toISOString(),
            },
          });
        }
      }

      toast.success('Interactions saved');
      await loadData();
      setViewMode('calendar');
    } catch {
      toast.error('Failed to save interactions');
    } finally {
      setSaving(false);
    }
  };

  const addNewPerson = async () => {
    if (!newPersonName.trim()) return;
    try {
      const res = await client.entities.people.create({
        data: {
          name: newPersonName.trim(),
          relationship_type: newPersonType,
          avatar_emoji: '🌿',
          is_given_garden: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
      });
      if (res?.data) {
        setPeople([...people, res.data]);
        setDetectedInteractions([
          ...detectedInteractions,
          {
            person: res.data,
            sentiment: 'neutral',
            intensity: 3,
            note: '',
            ignored: false,
          },
        ]);
      }
      setNewPersonName('');
      setShowAddPerson(false);
      toast.success(`Added ${newPersonName}`);
    } catch {
      toast.error('Failed to add person');
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 rounded-xl hover:bg-[#F8F5F0] transition-colors"
          >
            <ChevronLeft size={18} className="text-[#6B7B6E]" />
          </button>
          <h3 className="font-semibold text-[#2C3E2D]">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 rounded-xl hover:bg-[#F8F5F0] transition-colors"
          >
            <ChevronRight size={18} className="text-[#6B7B6E]" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-[#9CA89E] py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={i} />;
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateStr = toISODate(date);
            const entry = entries.find((e) => e.entry_date === dateStr);
            const isToday = dateStr === toISODate(today);
            const isFuture = date > today;
            const moodObj = entry ? MOODS.find((m) => m.value === entry.mood) : null;

            return (
              <button
                key={i}
                onClick={() => !isFuture && openEditor(date)}
                disabled={isFuture}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                  isToday
                    ? 'bg-[#2D5A3D] text-white font-semibold shadow-sm'
                    : entry
                    ? 'bg-[#2D5A3D]/10 text-[#2C3E2D] font-medium'
                    : isFuture
                    ? 'text-[#D4D0CA] cursor-default'
                    : 'text-[#6B7B6E] hover:bg-[#F8F5F0]'
                }`}
              >
                <span className="text-xs">{day}</span>
                {moodObj && <span className="text-[10px] mt-0.5">{moodObj.emoji}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#6B7B6E] mb-4">Please sign in to access your journal</p>
          <button onClick={() => client.auth.toLogin()} className="bg-[#2D5A3D] text-white px-6 py-3 rounded-2xl font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Calendar View
  if (viewMode === 'calendar') {
    return (
      <div className="min-h-screen bg-[#F8F5F0] pb-24">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-[#2C3E2D]">Journal</h1>
          <p className="text-sm text-[#6B7B6E] mt-1">Your daily reflections</p>
        </div>
        <div className="px-5 mb-4">{renderCalendar()}</div>

        {/* Recent entries */}
        <div className="px-5">
          <h3 className="text-sm font-semibold text-[#6B7B6E] mb-3 uppercase tracking-wide">Recent Entries</h3>
          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 text-center">
              <span className="text-3xl mb-3 block">🌱</span>
              <p className="text-sm text-[#6B7B6E]">No entries yet. Tap a date to start writing.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 5).map((entry) => {
                const moodObj = MOODS.find((m) => m.value === entry.mood);
                return (
                  <button
                    key={entry.id}
                    onClick={() => openEditor(new Date(entry.entry_date + 'T12:00:00'))}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      {moodObj && <span className="text-xl">{moodObj.emoji}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#9CA89E] mb-0.5">{formatDate(entry.entry_date)}</p>
                        <p className="text-sm text-[#2C3E2D] line-clamp-2">{entry.content}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Editor View
  if (viewMode === 'editor') {
    return (
      <div className="min-h-screen bg-[#F8F5F0] pb-24">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <button onClick={() => setViewMode('calendar')} className="p-2 -ml-2 rounded-xl hover:bg-white/50">
            <ChevronLeft size={20} className="text-[#6B7B6E]" />
          </button>
          <h2 className="font-semibold text-[#2C3E2D]">{formatDate(selectedDate)}</h2>
          <button
            onClick={handleSaveEntry}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#2D5A3D] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {/* Mood selector */}
        <div className="px-5 mb-4">
          <p className="text-xs font-medium text-[#6B7B6E] mb-2 uppercase tracking-wide">How are you feeling?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0 ${
                  mood === m.value
                    ? 'bg-[#2D5A3D]/10 border-2 border-[#2D5A3D]/30 scale-105'
                    : 'bg-white border-2 border-transparent hover:bg-[#F8F5F0]'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[10px] text-[#6B7B6E] font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Journal editor */}
        <div className="px-5">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DE]/50 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write about your day, your feelings, your interactions...&#10;&#10;Use @name to tag people in your entry."
              className="w-full min-h-[300px] p-5 text-[15px] text-[#2C3E2D] placeholder:text-[#C4BFB8] resize-none focus:outline-none leading-relaxed bg-transparent"
            />
          </div>
          <p className="text-xs text-[#9CA89E] mt-2 text-center">
            After saving, AI will help detect people and sentiment from your entry
          </p>
        </div>
      </div>
    );
  }

  // Interaction Review
  return (
    <div className="min-h-screen bg-[#F8F5F0] pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => setViewMode('editor')} className="p-2 -ml-2 rounded-xl hover:bg-white/50">
          <ChevronLeft size={20} className="text-[#6B7B6E]" />
        </button>
        <h2 className="font-semibold text-[#2C3E2D]">Interaction Review</h2>
        <button
          onClick={handleSaveInteractions}
          disabled={saving}
          className="flex items-center gap-1.5 bg-[#2D5A3D] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Done
        </button>
      </div>

      {analyzing ? (
        <div className="px-5 py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Sparkles size={24} className="text-[#D4A574] animate-pulse" />
            <p className="text-sm text-[#6B7B6E]">Analyzing your entry...</p>
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-3">
          <div className="bg-gradient-to-br from-[#2D5A3D]/5 to-[#8FBC8F]/10 rounded-2xl p-4 border border-[#2D5A3D]/10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-[#D4A574]" />
              <span className="text-xs font-medium text-[#D4A574]">AI Detected</span>
            </div>
            <p className="text-xs text-[#6B7B6E]">
              Review and adjust the detected interactions. You have full control over every detail.
            </p>
          </div>

          {detectedInteractions.length === 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DE]/50 text-center">
              <span className="text-2xl mb-2 block">🍃</span>
              <p className="text-sm text-[#6B7B6E]">No people detected. Add someone manually below.</p>
            </div>
          )}

          {detectedInteractions.map((interaction, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50 transition-opacity ${
                interaction.ignored ? 'opacity-40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{interaction.person.avatar_emoji || '🌿'}</span>
                  <span className="font-semibold text-[#2C3E2D] text-sm">{interaction.person.name}</span>
                </div>
                <button
                  onClick={() => {
                    const updated = [...detectedInteractions];
                    updated[idx].ignored = !updated[idx].ignored;
                    setDetectedInteractions(updated);
                  }}
                  className={`text-xs px-3 py-1 rounded-lg ${
                    interaction.ignored ? 'bg-[#F8F5F0] text-[#6B7B6E]' : 'bg-red-50 text-red-400'
                  }`}
                >
                  {interaction.ignored ? 'Include' : 'Ignore'}
                </button>
              </div>

              {!interaction.ignored && (
                <>
                  {/* Sentiment */}
                  <p className="text-[10px] font-medium text-[#9CA89E] uppercase tracking-wide mb-1.5">Sentiment</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-3">
                    {SENTIMENTS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          const updated = [...detectedInteractions];
                          updated[idx].sentiment = s.value;
                          setDetectedInteractions(updated);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium shrink-0 transition-all ${
                          interaction.sentiment === s.value
                            ? 'text-white shadow-sm'
                            : 'bg-[#F8F5F0] text-[#6B7B6E]'
                        }`}
                        style={interaction.sentiment === s.value ? { backgroundColor: s.color } : {}}
                      >
                        <span>{s.emoji}</span>
                        <span className="hidden sm:inline">{s.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Intensity */}
                  <p className="text-[10px] font-medium text-[#9CA89E] uppercase tracking-wide mb-1.5">Intensity</p>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          const updated = [...detectedInteractions];
                          updated[idx].intensity = level;
                          setDetectedInteractions(updated);
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                          interaction.intensity >= level
                            ? 'bg-[#2D5A3D] text-white'
                            : 'bg-[#F8F5F0] text-[#9CA89E]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  {/* Note */}
                  <input
                    type="text"
                    value={interaction.note}
                    onChange={(e) => {
                      const updated = [...detectedInteractions];
                      updated[idx].note = e.target.value;
                      setDetectedInteractions(updated);
                    }}
                    placeholder="Add a personal note..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] placeholder:text-[#C4BFB8] focus:outline-none focus:ring-1 focus:ring-[#2D5A3D]/20"
                  />
                </>
              )}
            </div>
          ))}

          {/* Add person */}
          {showAddPerson ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E4DE]/50">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Person's name"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] placeholder:text-[#C4BFB8] focus:outline-none"
                />
                <button
                  onClick={addNewPerson}
                  className="p-2 bg-[#2D5A3D] text-white rounded-xl"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setShowAddPerson(false)}
                  className="p-2 bg-[#F8F5F0] text-[#6B7B6E] rounded-xl"
                >
                  <X size={16} />
                </button>
              </div>
              <select
                value={newPersonType}
                onChange={(e) => setNewPersonType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F5F0] text-sm text-[#2C3E2D] focus:outline-none"
              >
                <option value="spouse">Spouse/Partner</option>
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="coworker">Coworker</option>
                <option value="acquaintance">Acquaintance</option>
                <option value="other">Other</option>
              </select>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPerson(true)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-dashed border-[#D4D0CA] flex items-center justify-center gap-2 text-sm text-[#6B7B6E] hover:border-[#2D5A3D]/30 hover:text-[#2D5A3D] transition-colors"
            >
              <Plus size={16} />
              Add a person manually
            </button>
          )}

          <button
            onClick={() => {
              setViewMode('calendar');
              toast.info('Skipped interaction review');
            }}
            className="w-full text-center text-xs text-[#9CA89E] py-3"
          >
            Skip review for now
          </button>
        </div>
      )}
    </div>
  );
}
