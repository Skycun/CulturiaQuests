import { defineStore } from 'pinia'
import type {
  QuizQuestion,
  QuizAnswer,
  QuizAttempt,
  QuizSubmitResult,
  LeaderboardEntry,
  GetTodayQuizResponse,
  SubmitQuizResponse,
  LeaderboardResponse,
  GetAttemptResponse,
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
        const res = await client<GetTodayQuizResponse>('/quiz-attempts/today', { method: 'GET' })

        if (res.data.alreadyCompleted) {
          this.alreadyCompleted = true
          this.existingAttempt = res.data.attempt || null
          // Nettoyer le localStorage si le quiz est déjà complété
          this.clearSavedAnswers()
        } else {
          this.sessionId = res.data.sessionId || null
          this.sessionDate = res.data.date || null
          this.questions = res.data.questions || []
          this.resetQuizState()
          // Restaurer les réponses sauvegardées si elles existent
          this.loadSavedAnswers()
        }

        await this.fetchLeaderboard()
      } catch (e: unknown) {
        const error = e as { error?: { status?: number; message?: string }; message?: string }
        if (error?.error?.status === 404) {
          this.error = "Aucun quiz disponible pour aujourd'hui. Revenez plus tard !"
        } else {
          this.error = error?.error?.message || error?.message || 'Erreur'
        }
      } finally {
        this.loading = false
      }
    },

    async fetchLeaderboard() {
      const client = useStrapiClient()
      this.leaderboardLoading = true

      try {
        const res = await client<LeaderboardResponse>('/quiz-attempts/leaderboard', { method: 'GET' })
        this.leaderboard = res.data || []
      } catch (e: unknown) {
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

        const res = await client<SubmitQuizResponse>('/quiz-attempts/submit', {
          method: 'POST',
          body: {
            sessionId: this.sessionId,
            answers: formattedAnswers,
            timeSpentSeconds: this.timeSpentSeconds,
          },
        })

        this.submitResult = res.data
        // Nettoyer le localStorage après soumission réussie
        this.clearSavedAnswers()
        await this.fetchLeaderboard()
      } catch (e: unknown) {
        const error = e as { error?: { message?: string }; message?: string }
        this.error = error?.error?.message || error?.message || 'Erreur lors de la soumission'
      } finally {
        this.submitting = false
      }
    },

    async fetchResults(documentId: string) {
      const client = useStrapiClient()
      this.loading = true
      this.error = null

      try {
        const res = await client<GetAttemptResponse>(`/quiz-attempts/${documentId}`, {
          method: 'GET',
          params: {
            populate: {
              guild: { fields: ['quiz_streak'] }
            }
          }
        })

        const data = res.data
        this.submitResult = {
          attempt: {
            documentId: data.documentId,
            score: data.score,
            completed_at: data.completed_at,
          },
          score: data.score,
          rewards: data.rewards || { tier: 'bronze', gold: 0, exp: 0, items: [] },
          detailedAnswers: (data as any).answers || [],
          newStreak: data.guild?.quiz_streak || 0,
        }
      } catch (e: unknown) {
        const error = e as { error?: { message?: string }; message?: string }
        this.error = error?.error?.message || error?.message || 'Erreur lors du chargement des résultats'
      } finally {
        this.loading = false
      }
    },

    // Navigation
    selectAnswer(answer: string) {
      const q = this.currentQuestion
      if (this.quizFinished || !q) return
      this.answers[q.documentId] = answer
      // Sauvegarder automatiquement dans localStorage
      this.saveAnswers()
    },

    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
        this.saveAnswers()
      } else {
        this.quizFinished = true
        this.finishedAt = Date.now()
        this.saveAnswers()
      }
    },

    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.saveAnswers()
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
      this.clearSavedAnswers()
      this.$reset()
    },

    // LocalStorage management
    saveAnswers() {
      if (!this.sessionId) return
      try {
        const data = {
          sessionId: this.sessionId,
          answers: this.answers,
          currentIndex: this.currentIndex,
          startTime: this.startTime,
        }
        localStorage.setItem('quiz_current_session', JSON.stringify(data))
      } catch (e) {
        console.warn('Failed to save quiz answers to localStorage:', e)
      }
    },

    loadSavedAnswers() {
      if (!this.sessionId) return
      try {
        const saved = localStorage.getItem('quiz_current_session')
        if (!saved) return

        const data = JSON.parse(saved)
        // Vérifier que c'est la même session
        if (data.sessionId === this.sessionId) {
          this.answers = data.answers || {}
          this.currentIndex = data.currentIndex || 0
          this.startTime = data.startTime || Date.now()
        } else {
          // Session différente, nettoyer
          this.clearSavedAnswers()
        }
      } catch (e) {
        console.warn('Failed to load quiz answers from localStorage:', e)
        this.clearSavedAnswers()
      }
    },

    clearSavedAnswers() {
      try {
        localStorage.removeItem('quiz_current_session')
      } catch (e) {
        console.warn('Failed to clear quiz answers from localStorage:', e)
      }
    },
  },
})
