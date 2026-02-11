// ============================================================================
// Quiz Types
// ============================================================================

export interface QuizTag {
  documentId: string
  name: string
}

export interface QuizQuestion {
  documentId: string
  question_text: string
  question_type: 'qcm' | 'timeline'
  order: number
  options?: string[]
  timeline_range?: {
    min: number
    max: number
  }
  tag?: QuizTag
}

export interface QuizSession {
  sessionId: string
  date: string
  questions: QuizQuestion[]
}

export interface QuizAnswer {
  questionId: string
  answer: string
}

export interface DetailedAnswer {
  questionId: string
  questionText: string
  userAnswer: string | null
  correctAnswer: string
  score: number
  isCorrect: boolean
  explanation: string | null
}

export interface QuizRewardItem {
  documentId: string
  name: string
  rarity: string
  level: number
  index_damage: number
  slot: 'weapon' | 'helmet' | 'charm'
  icon?: { url: string }
  tags?: Array<{ name: string }>
}

export interface QuizRewards {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  gold: number
  exp: number
  items: QuizRewardItem[]
}

export interface QuizAttempt {
  documentId: string
  score: number
  completed_at: string
  time_spent_seconds?: number
}

export interface QuizSubmitResult {
  attempt: QuizAttempt
  score: number
  rewards: QuizRewards
  detailedAnswers: DetailedAnswer[]
  newStreak: number
}

export interface LeaderboardEntry {
  rank: number
  username: string
  guildName: string
  score: number
  correctCount: number
  streak: number
  isMe: boolean
  avatarUrl: string | null
}

export interface QuizHistoryEntry {
  documentId: string
  date: string
  score: number
  rewards: QuizRewards
  completed_at: string
  time_spent_seconds?: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GetTodayQuizResponse {
  data: {
    alreadyCompleted: boolean
    attempt?: QuizAttempt
    sessionId?: string
    date?: string
    questions?: QuizQuestion[]
  }
}

export interface SubmitQuizResponse {
  data: QuizSubmitResult
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[]
}

export interface GetAttemptResponse {
  data: QuizAttempt & {
    guild?: {
      quiz_streak: number
    }
  }
}

// ============================================================================
// Tier Helpers (réutilisables)
// ============================================================================

export const TIER_COLORS: Record<string, string> = {
  platinum: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white',
  gold: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
  silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
  bronze: 'bg-gradient-to-r from-orange-600 to-orange-800 text-white',
}

export const TIER_LABELS: Record<string, string> = {
  platinum: '🏆 Platine',
  gold: '🥇 Or',
  silver: '🥈 Argent',
  bronze: '🥉 Bronze',
}

export function getTierColor(tier: string): string {
  return TIER_COLORS[tier] || 'bg-gray-200'
}

export function getTierLabel(tier: string): string {
  return TIER_LABELS[tier] || tier
}

export const SLOT_LABELS: Record<QuizRewardItem['slot'], string> = {
  weapon: 'Arme',
  helmet: 'Casque',
  charm: 'Charme',
}

export function getSlotLabel(slot: QuizRewardItem['slot']): string {
  return SLOT_LABELS[slot]
}

export const RARITY_COLORS: Record<string, string> = {
  legendary: 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50',
  epic: 'border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50',
  rare: 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50',
  common: 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50',
  basic: 'border-l-4 border-l-gray-400 bg-gradient-to-r from-gray-50',
}

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity.toLowerCase()] || 'border-l-4 border-l-gray-400'
}

export const MAX_QUIZ_SCORE = 2150
