# Intégration Frontend - Quiz System

## Vue d'ensemble

Intégration complète du système de quiz dans le frontend Nuxt avec Pinia stores, pages Vue, et composants réutilisables.

## Store Pinia

### Fichier: Quiz Store

**Fichier:** `frontend/app/stores/quiz.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { QuizSession, QuizQuestion, QuizAttempt, LeaderboardEntry } from '~/types/quiz';

export const useQuizStore = defineStore('quiz', () => {
  // State
  const currentSession = ref<QuizSession | null>(null);
  const questions = ref<QuizQuestion[]>([]);
  const userAnswers = ref<Record<string, string>>({});
  const attempt = ref<QuizAttempt | null>(null);
  const leaderboard = ref<LeaderboardEntry[]>([]);
  const history = ref<QuizAttempt[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const hasCompletedToday = computed(() => attempt.value !== null);
  const answeredCount = computed(() => Object.keys(userAnswers.value).length);
  const allAnswered = computed(() => answeredCount.value === 10);
  const currentStreak = computed(() => {
    const { guild } = useGuildStore();
    return guild?.quiz_streak || 0;
  });

  // Actions
  async function fetchTodayQuiz() {
    loading.value = true;
    error.value = null;

    try {
      const { find } = useStrapi();
      const response = await find('quiz-attempts/today');

      currentSession.value = {
        sessionId: response.data.sessionId,
        date: new Date().toISOString().split('T')[0]
      };
      questions.value = response.data.questions;
      userAnswers.value = {};

      return response.data;
    } catch (err: any) {
      if (err.error?.status === 400 && err.error?.message?.includes('already completed')) {
        error.value = 'already_completed';
      } else if (err.error?.status === 404) {
        error.value = 'no_quiz_today';
      } else {
        error.value = err.error?.message || 'Une erreur est survenue';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function submitQuiz() {
    if (!currentSession.value || !allAnswered.value) {
      throw new Error('Quiz incomplet');
    }

    loading.value = true;
    error.value = null;

    try {
      const { create } = useStrapi();

      // Formater les réponses
      const answers = questions.value.map(q => ({
        questionId: q.documentId,
        answer: userAnswers.value[q.documentId]
      }));

      const response = await create('quiz-attempts/submit', {
        sessionId: currentSession.value.sessionId,
        answers
      });

      attempt.value = response.data.attempt;

      // Mettre à jour le guild store avec les nouvelles valeurs
      const guildStore = useGuildStore();
      await guildStore.fetchGuild();

      return response.data;
    } catch (err: any) {
      error.value = err.error?.message || 'Erreur lors de la soumission';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchLeaderboard() {
    loading.value = true;

    try {
      const { find } = useStrapi();
      const response = await find('quiz-attempts/leaderboard');
      leaderboard.value = response.data;
      return response.data;
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchHistory(limit = 30) {
    loading.value = true;

    try {
      const { find } = useStrapi();
      const response = await find('quiz-attempts/history', { limit });
      history.value = response.data;
      return response.data;
    } catch (err) {
      console.error('Error fetching history:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  function setAnswer(questionId: string, answer: string) {
    userAnswers.value[questionId] = answer;
  }

  function reset() {
    currentSession.value = null;
    questions.value = [];
    userAnswers.value = {};
    attempt.value = null;
    error.value = null;
  }

  return {
    // State
    currentSession,
    questions,
    userAnswers,
    attempt,
    leaderboard,
    history,
    loading,
    error,

    // Getters
    hasCompletedToday,
    answeredCount,
    allAnswered,
    currentStreak,

    // Actions
    fetchTodayQuiz,
    submitQuiz,
    fetchLeaderboard,
    fetchHistory,
    setAnswer,
    reset
  };
});
```

## Types TypeScript

### Fichier: Quiz Types

**Fichier:** `frontend/app/types/quiz.ts`

```typescript
export interface QuizSession {
  sessionId: string;
  date: string;
}

export interface QuizQuestion {
  documentId: string;
  question_text: string;
  question_type: 'qcm' | 'timeline';
  order: number;
  options?: string[];  // Pour QCM
  timeline_range?: {   // Pour Timeline
    min: number;
    max: number;
  };
  tag?: {
    documentId: string;
    name: string;
  };
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface QuizAttempt {
  documentId: string;
  score: number;
  completed_at: string;
  answers: DetailedAnswer[];
  rewards: QuizRewards;
}

export interface DetailedAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  score: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizRewards {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  gold: number;
  exp: number;
  items: RewardItem[];
}

export interface RewardItem {
  documentId: string;
  name: string;
  rarity: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  guildName: string;
  score: number;
  streak: number;
  isMe: boolean;
}
```

## Pages Vue

### Page Principale du Quiz

**Fichier:** `frontend/app/pages/quiz/index.vue`

```vue
<template>
  <div class="quiz-page">
    <!-- Header -->
    <div class="quiz-header">
      <h1 class="text-3xl font-bold">Quiz Quotidien</h1>
      <div class="streak-badge">
        🔥 {{ currentStreak }} jours
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
      <p>Chargement du quiz...</p>
    </div>

    <!-- Error States -->
    <div v-else-if="error === 'already_completed'" class="completed-state">
      <p class="text-xl mb-4">Vous avez déjà complété le quiz d'aujourd'hui !</p>
      <button @click="navigateTo('/quiz/results')" class="btn-primary">
        Voir mes résultats
      </button>
      <button @click="navigateTo('/quiz/leaderboard')" class="btn-secondary">
        Voir le classement
      </button>
    </div>

    <div v-else-if="error === 'no_quiz_today'" class="error-state">
      <p>Aucun quiz disponible pour aujourd'hui. Revenez plus tard !</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchTodayQuiz" class="btn-secondary">
        Réessayer
      </button>
    </div>

    <!-- Quiz Questions -->
    <div v-else-if="questions.length > 0" class="quiz-content">
      <!-- Progress Bar -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${(answeredCount / 10) * 100}%` }"
        ></div>
      </div>
      <p class="progress-text">{{ answeredCount }} / 10 questions répondues</p>

      <!-- Questions List -->
      <div class="questions-list">
        <QuizQuestionCard
          v-for="question in questions"
          :key="question.documentId"
          :question="question"
          :answer="userAnswers[question.documentId]"
          @answer="setAnswer(question.documentId, $event)"
        />
      </div>

      <!-- Submit Button -->
      <button
        @click="handleSubmit"
        :disabled="!allAnswered || submitting"
        class="btn-submit"
        :class="{ disabled: !allAnswered }"
      >
        <span v-if="submitting">Soumission en cours...</span>
        <span v-else-if="!allAnswered">
          Répondez aux {{ 10 - answeredCount }} questions restantes
        </span>
        <span v-else>Soumettre mes réponses</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuizStore } from '~/stores/quiz';

const quizStore = useQuizStore();
const {
  questions,
  userAnswers,
  loading,
  error,
  answeredCount,
  allAnswered,
  currentStreak
} = storeToRefs(quizStore);

const submitting = ref(false);

onMounted(async () => {
  try {
    await quizStore.fetchTodayQuiz();
  } catch (err) {
    // Erreur gérée dans le store
  }
});

async function handleSubmit() {
  if (!allAnswered.value) return;

  submitting.value = true;
  try {
    await quizStore.submitQuiz();
    navigateTo('/quiz/results');
  } catch (err) {
    console.error('Submit error:', err);
  } finally {
    submitting.value = false;
  }
}

function setAnswer(questionId: string, answer: string) {
  quizStore.setAnswer(questionId, answer);
}
</script>
```

### Page de Résultats

**Fichier:** `frontend/app/pages/quiz/results.vue`

```vue
<template>
  <div class="results-page">
    <div v-if="attempt" class="results-content">
      <!-- Score Display -->
      <div class="score-display">
        <h1 class="text-4xl font-bold mb-2">{{ attempt.score }} points</h1>
        <div class="tier-badge" :class="`tier-${attempt.rewards.tier}`">
          {{ getTierLabel(attempt.rewards.tier) }}
        </div>
      </div>

      <!-- Rewards Display -->
      <QuizRewardsDisplay :rewards="attempt.rewards" />

      <!-- Detailed Answers -->
      <div class="answers-review">
        <h2 class="text-2xl font-bold mb-4">Vos réponses</h2>
        <QuizAnswerCard
          v-for="(answer, index) in attempt.answers"
          :key="answer.questionId"
          :answer="answer"
          :number="index + 1"
        />
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="navigateTo('/quiz/leaderboard')" class="btn-primary">
          Voir le classement
        </button>
        <button @click="navigateTo('/quiz/history')" class="btn-secondary">
          Historique
        </button>
      </div>
    </div>

    <div v-else class="no-attempt">
      <p>Aucun résultat disponible.</p>
      <button @click="navigateTo('/quiz')" class="btn-primary">
        Faire le quiz
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQuizStore } from '~/stores/quiz';

const quizStore = useQuizStore();
const { attempt } = storeToRefs(quizStore);

function getTierLabel(tier: string) {
  const labels = {
    bronze: 'Bronze',
    silver: 'Argent',
    gold: 'Or',
    platinum: 'Platine'
  };
  return labels[tier] || tier;
}
</script>
```

### Page Leaderboard

**Fichier:** `frontend/app/pages/quiz/leaderboard.vue`

```vue
<template>
  <div class="leaderboard-page">
    <h1 class="text-3xl font-bold mb-6">Classement du Jour</h1>

    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
    </div>

    <div v-else-if="leaderboard.length === 0" class="empty-state">
      <p>Aucun ami n'a encore fait le quiz aujourd'hui.</p>
    </div>

    <div v-else class="leaderboard-list">
      <div
        v-for="entry in leaderboard"
        :key="entry.username"
        :class="[
          'leaderboard-entry',
          { 'is-me': entry.isMe }
        ]"
      >
        <div class="rank">
          <span class="rank-badge" :class="getRankClass(entry.rank)">
            {{ getRankEmoji(entry.rank) }} {{ entry.rank }}
          </span>
        </div>

        <div class="user-info">
          <p class="username">
            {{ entry.username }}
            <span v-if="entry.isMe" class="me-badge">Vous</span>
          </p>
          <p class="guild-name">{{ entry.guildName }}</p>
        </div>

        <div class="stats">
          <p class="score">{{ entry.score }} pts</p>
          <p class="streak">🔥 {{ entry.streak }}</p>
        </div>
      </div>
    </div>

    <button @click="navigateTo('/quiz')" class="btn-secondary mt-6">
      Retour au quiz
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQuizStore } from '~/stores/quiz';

const quizStore = useQuizStore();
const { leaderboard, loading } = storeToRefs(quizStore);

onMounted(async () => {
  await quizStore.fetchLeaderboard();
});

function getRankClass(rank: number) {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return 'rank-default';
}

function getRankEmoji(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}
</script>
```

## Composants

### QuizQuestionCard (Wrapper)

**Fichier:** `frontend/app/components/quiz/QuizQuestionCard.vue`

```vue
<template>
  <div class="question-card">
    <div class="question-header">
      <span class="question-number">Question {{ question.order }}</span>
      <span v-if="question.tag" class="question-tag">
        {{ question.tag.name }}
      </span>
    </div>

    <p class="question-text">{{ question.question_text }}</p>

    <QuizQuestionQCM
      v-if="question.question_type === 'qcm'"
      :options="question.options"
      :selected="answer"
      @select="$emit('answer', $event)"
    />

    <QuizQuestionTimeline
      v-else-if="question.question_type === 'timeline'"
      :range="question.timeline_range"
      :selected="answer"
      @select="$emit('answer', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { QuizQuestion } from '~/types/quiz';

defineProps<{
  question: QuizQuestion;
  answer?: string;
}>();

defineEmits<{
  answer: [value: string];
}>();
</script>
```

### QuizQuestionQCM

**Fichier:** `frontend/app/components/quiz/QuizQuestionQCM.vue`

```vue
<template>
  <div class="qcm-options">
    <button
      v-for="(option, index) in options"
      :key="index"
      @click="$emit('select', option)"
      :class="[
        'qcm-option',
        { selected: selected === option }
      ]"
    >
      <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
      <span class="option-text">{{ option }}</span>
      <span v-if="selected === option" class="checkmark">✓</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  options: string[];
  selected?: string;
}>();

defineEmits<{
  select: [value: string];
}>();
</script>
```

### QuizQuestionTimeline

**Fichier:** `frontend/app/components/quiz/QuizQuestionTimeline.vue`

```vue
<template>
  <div class="timeline-input">
    <div class="slider-container">
      <input
        type="range"
        :min="range.min"
        :max="range.max"
        :value="localValue"
        @input="handleInput"
        class="timeline-slider"
      />
    </div>

    <div class="value-display">
      <span class="year-label">Année sélectionnée:</span>
      <span class="year-value">{{ localValue }}</span>
    </div>

    <div class="range-labels">
      <span>{{ range.min }}</span>
      <span>{{ range.max }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  range: { min: number; max: number };
  selected?: string;
}>();

const emit = defineEmits<{
  select: [value: string];
}>();

const localValue = ref(
  props.selected
    ? parseInt(props.selected)
    : Math.floor((props.range.min + props.range.max) / 2)
);

watch(() => props.selected, (newVal) => {
  if (newVal) {
    localValue.value = parseInt(newVal);
  }
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  localValue.value = parseInt(target.value);
  emit('select', target.value);
}
</script>

<style scoped>
.timeline-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  outline: none;
  -webkit-appearance: none;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 3px solid #8b5cf6;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
```

### QuizRewardsDisplay

**Fichier:** `frontend/app/components/quiz/QuizRewardsDisplay.vue`

```vue
<template>
  <div class="rewards-display">
    <h2 class="text-2xl font-bold mb-4">Récompenses</h2>

    <div class="rewards-grid">
      <!-- Gold Badge -->
      <div class="reward-badge gold-badge">
        <span class="icon">🪙</span>
        <span class="amount">{{ rewards.gold }}</span>
        <span class="label">Gold</span>
      </div>

      <!-- XP Badge -->
      <div class="reward-badge xp-badge">
        <span class="icon">⭐</span>
        <span class="amount">{{ rewards.exp }}</span>
        <span class="label">XP</span>
      </div>
    </div>

    <!-- Items -->
    <div v-if="rewards.items.length > 0" class="rewards-items">
      <h3 class="text-xl font-semibold mb-2">Items obtenus</h3>
      <div class="items-grid">
        <RewardItemCard
          v-for="item in rewards.items"
          :key="item.documentId"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuizRewards } from '~/types/quiz';

defineProps<{
  rewards: QuizRewards;
}>();
</script>
```

## Navigation et Routing

### Ajouter au Layout Principal

**Fichier:** `frontend/app/layouts/default.vue`

Ajouter un lien vers le quiz dans la navigation:

```vue
<NuxtLink to="/quiz" class="nav-link">
  <span class="icon">📝</span>
  <span>Quiz</span>
</NuxtLink>
```

### Routes

- `/quiz` - Page principale (questions)
- `/quiz/results` - Résultats du quiz
- `/quiz/leaderboard` - Classement
- `/quiz/history` - Historique des tentatives

## Tailwind Styling

### Classes utilitaires

```css
/* Tier Colors */
.tier-platinum {
  @apply bg-gradient-to-r from-cyan-400 to-blue-500 text-white;
}

.tier-gold {
  @apply bg-gradient-to-r from-amber-400 to-yellow-500 text-white;
}

.tier-silver {
  @apply bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800;
}

.tier-bronze {
  @apply bg-gradient-to-r from-orange-700 to-orange-800 text-white;
}

/* Rank Colors */
.rank-gold {
  @apply bg-gradient-to-br from-yellow-400 to-yellow-600;
}

.rank-silver {
  @apply bg-gradient-to-br from-gray-300 to-gray-500;
}

.rank-bronze {
  @apply bg-gradient-to-br from-orange-600 to-orange-800;
}

/* Highlight Current User */
.is-me {
  @apply border-2 border-purple-500 bg-purple-50;
}
```

## Responsive Design

### Mobile-First

Toutes les pages sont optimisées mobile:
- Questions empilées verticalement
- Slider timeline optimisé touch
- Leaderboard scrollable
- Boutons large touch targets (min 44px)

### Breakpoints

```vue
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Questions en 1 col mobile, 2 cols desktop -->
</div>
```

## Tests E2E

### Fichier: Quiz Playwright Tests

**Fichier:** `frontend/tests/e2e/quiz.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Quiz System', () => {
  test('should load today quiz', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.locator('h1')).toContainText('Quiz Quotidien');
    await expect(page.locator('.question-card')).toHaveCount(10);
  });

  test('should answer QCM question', async ({ page }) => {
    await page.goto('/quiz');
    const firstQCM = page.locator('.qcm-options').first();
    await firstQCM.locator('.qcm-option').first().click();
    await expect(firstQCM.locator('.qcm-option.selected')).toBeVisible();
  });

  test('should submit quiz when all answered', async ({ page }) => {
    await page.goto('/quiz');

    // Répondre à toutes les questions
    for (let i = 0; i < 10; i++) {
      const question = page.locator('.question-card').nth(i);
      if (await question.locator('.qcm-options').isVisible()) {
        await question.locator('.qcm-option').first().click();
      } else {
        await question.locator('.timeline-slider').fill('1950');
      }
    }

    // Soumettre
    await page.locator('.btn-submit').click();
    await expect(page).toHaveURL('/quiz/results');
  });

  test('should show leaderboard', async ({ page }) => {
    await page.goto('/quiz/leaderboard');
    await expect(page.locator('h1')).toContainText('Classement');
  });
});
```

## Fichiers de Référence

- `/frontend/app/stores/guild.ts` - Pattern de store Pinia existant
- `/frontend/app/stores/visit.ts` - Pattern de gestion de cooldown/availability
- `/frontend/app/components/chest/ChestLootDisplay.vue` - Pattern d'affichage de rewards
- `/frontend/app/pages/friends.vue` - Pattern de page avec liste sociale

## Checklist d'Intégration

- [ ] Créer types TypeScript (`types/quiz.ts`)
- [ ] Créer store Pinia (`stores/quiz.ts`)
- [ ] Créer pages (`pages/quiz/index.vue`, `results.vue`, `leaderboard.vue`)
- [ ] Créer composants questions (QCM, Timeline)
- [ ] Créer composants rewards display
- [ ] Créer composant leaderboard entry
- [ ] Ajouter navigation dans layout
- [ ] Styliser avec Tailwind
- [ ] Tester responsive mobile
- [ ] Ajouter tests E2E
- [ ] Tester flow complet utilisateur
