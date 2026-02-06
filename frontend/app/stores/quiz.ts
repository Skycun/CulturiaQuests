import { defineStore } from 'pinia'
import type {
  QuizQuestion,
  QuizAnswer,
  QuizAttempt,
  QuizSubmitResult,
  LeaderboardEntry,
} from '~/types/quiz'

interface QuizState {
  // Session
  sessionId: string | null
  sessionDate: string | null
  questions: QuizQuestion[]

  // Progression
  currentIndex: number
  answers: Record<string, string>
  quizFinished: boolean
  startTime: number
  finishedAt: number

  // Résultats
  submitResult: QuizSubmitResult | null
  alreadyCompleted: boolean
  existingAttempt: QuizAttempt | null

  // Leaderboard
  leaderboard: LeaderboardEntry[]

  // UI State
  loading: boolean
  submitting: boolean
  leaderboardLoading: boolean
  error: string | null
}

export const useQuizStore = defineStore('quiz', {
  state: (): QuizState => ({
    sessionId: null,
    sessionDate: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    quizFinished: false,
    startTime: 0,
    finishedAt: 0,
    submitResult: null,
    alreadyCompleted: false,
    existingAttempt: null,
    leaderboard: [],
    loading: false,
    submitting: false,
    leaderboardLoading: false,
    error: null,
  }),

  getters: {
    currentQuestion: (state): QuizQuestion | null =>
      state.questions[state.currentIndex] || null,

    selectedAnswer(): string | null {
      const q = this.currentQuestion
      return q ? this.answers[q.documentId] || null : null
    },

    answeredCount: (state): number =>
      Object.keys(state.answers).length,

    isComplete(): boolean {
      return this.answeredCount === this.questions.length && this.questions.length > 0
    },

    timeSpentSeconds: (state): number =>
      state.finishedAt > 0 ? Math.round((state.finishedAt - state.startTime) / 1000) : 0,
  },

  actions: {
    async fetchTodayQuiz() {
      const client = useStrapiClient()
      this.loading = true
      this.error = null
      this.alreadyCompleted = false
      this.existingAttempt = null

      try {
        const res = await client<any>('/quiz-attempts/today', { method: 'GET' })

        if (res.data.alreadyCompleted) {
          this.alreadyCompleted = true
          this.existingAttempt = res.data.attempt
        } else {
          this.sessionId = res.data.sessionId
          this.sessionDate = res.data.date
          this.questions = res.data.questions || []
          this.resetQuizState()
        }

        await this.fetchLeaderboard()
      } catch (e: any) {
        if (e?.error?.status === 404) {
          this.error = "Aucun quiz disponible pour aujourd'hui. Revenez plus tard !"
        } else {
          this.error = e?.error?.message || e?.message || 'Erreur'
        }
      } finally {
        this.loading = false
      }
    },

    async fetchLeaderboard() {
      const client = useStrapiClient()
      this.leaderboardLoading = true

      try {
        const res = await client<any>('/quiz-attempts/leaderboard', { method: 'GET' })
        this.leaderboard = res.data || []
      } catch (e: any) {
        console.error('Leaderboard error:', e)
      } finally {
        this.leaderboardLoading = false
      }
    },

    async submitQuiz() {
      if (!this.sessionId) {
        this.error = 'Session non trouvée'
        return
      }

      const client = useStrapiClient()
      this.submitting = true
      this.error = null

      try {
        const formattedAnswers: QuizAnswer[] = this.questions.map((q) => ({
          questionId: q.documentId,
          answer: this.answers[q.documentId] || '',
        }))

        const res = await client<any>('/quiz-attempts/submit', {
          method: 'POST',
          body: {
            sessionId: this.sessionId,
            answers: formattedAnswers,
            timeSpentSeconds: this.timeSpentSeconds,
          },
        })

        this.submitResult = res.data
        await this.fetchLeaderboard()
      } catch (e: any) {
        this.error = e?.error?.message || e?.message || 'Erreur lors de la soumission'
      } finally {
        this.submitting = false
      }
    },

    // Navigation
    selectAnswer(answer: string) {
      const q = this.currentQuestion
      if (this.quizFinished || !q) return
      this.answers[q.documentId] = answer
    },

    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
      } else {
        this.quizFinished = true
        this.finishedAt = Date.now()
      }
    },

    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },

    goBackToQuestions() {
      this.quizFinished = false
    },

    // Reset
    resetQuizState() {
      this.currentIndex = 0
      this.answers = {}
      this.quizFinished = false
      this.submitResult = null
      this.startTime = Date.now()
      this.finishedAt = 0
    },

    resetAll() {
      this.$reset()
    },
  },
})
