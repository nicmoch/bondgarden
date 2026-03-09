import { createClient } from '@metagptx/web-sdk';

export const client = createClient();

// Sentiment score mapping
export const SENTIMENT_SCORES: Record<string, number> = {
  very_positive: 5,
  positive: 3,
  slightly_positive: 1,
  neutral: 0,
  slightly_negative: -1,
  negative: -3,
  very_negative: -5,
};

// Fulfillment score mapping
export const FULFILLMENT_SCORES: Record<string, number> = {
  fulfilled: 3,
  partial: 1,
  missed: 0,
  hurtful: -2,
};

// Calculate bamboo health color based on health score (-5 to 5 range)
export function getBambooColor(healthScore: number): string {
  if (healthScore >= 3) return '#2D5A3D'; // Deep healthy green
  if (healthScore >= 1) return '#4A7C59'; // Bamboo green
  if (healthScore >= 0) return '#8FBC8F'; // Sage
  if (healthScore >= -2) return '#D4A574'; // Warm earth (declining)
  return '#C97B5A'; // Stressed brown
}

// Calculate bamboo height (0-100%) based on balance score
export function getBambooHeight(balanceScore: number): number {
  // Normalize from roughly -50 to 50 range to 20-100%
  return Math.max(20, Math.min(100, 50 + balanceScore));
}

// Calculate leaf density (0-5) based on recent positive interactions
export function getLeafDensity(recentPositiveCount: number): number {
  return Math.min(5, recentPositiveCount);
}

// Get trend icon
export function getTrendIcon(trend: string): string {
  if (trend === 'growing') return '🌱';
  if (trend === 'declining') return '🍂';
  return '🌿';
}

// Mood options
export const MOODS = [
  { value: 'happy', label: 'Happy', emoji: '😊', score: 9 },
  { value: 'calm', label: 'Calm', emoji: '😌', score: 7 },
  { value: 'grateful', label: 'Grateful', emoji: '🙏', score: 8 },
  { value: 'neutral', label: 'Neutral', emoji: '😐', score: 5 },
  { value: 'anxious', label: 'Anxious', emoji: '😰', score: 3 },
  { value: 'sad', label: 'Sad', emoji: '😢', score: 2 },
  { value: 'angry', label: 'Angry', emoji: '😤', score: 1 },
];

// Sentiment options for interaction review
export const SENTIMENTS = [
  { value: 'very_positive', label: 'Very Positive', emoji: '💚', color: '#2D5A3D' },
  { value: 'positive', label: 'Positive', emoji: '🌿', color: '#4A7C59' },
  { value: 'slightly_positive', label: 'Slightly Positive', emoji: '🌱', color: '#8FBC8F' },
  { value: 'neutral', label: 'Neutral', emoji: '🍃', color: '#B0B0B0' },
  { value: 'slightly_negative', label: 'Slightly Negative', emoji: '🍂', color: '#D4A574' },
  { value: 'negative', label: 'Negative', emoji: '🥀', color: '#C97B5A' },
  { value: 'very_negative', label: 'Very Negative', emoji: '🍁', color: '#E57373' },
];

// Relationship types
export const RELATIONSHIP_TYPES = [
  { value: 'spouse', label: 'Spouse/Partner', emoji: '💑' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'friend', label: 'Friend', emoji: '👫' },
  { value: 'coworker', label: 'Coworker', emoji: '💼' },
  { value: 'acquaintance', label: 'Acquaintance', emoji: '👋' },
  { value: 'other', label: 'Other', emoji: '🌸' },
];

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
