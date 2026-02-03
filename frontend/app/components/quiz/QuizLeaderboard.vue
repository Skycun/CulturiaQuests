<script setup lang="ts">
interface LeaderboardEntry {
  rank: number
  username: string
  score: number
  streak: number
  isMe: boolean
}

defineProps<{
  entries: LeaderboardEntry[]
}>()

function getRankEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}
</script>

<template>
  <div v-if="entries.length > 0" class="bg-white border rounded-lg p-4 shadow-sm">
    <h3 class="text-lg font-semibold mb-3">🏅 Classement du jour</h3>
    <div class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.username"
        class="flex items-center justify-between p-2 rounded"
        :class="entry.isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'"
      >
        <div class="flex items-center gap-2">
          <span class="font-bold w-8">{{ getRankEmoji(entry.rank) }}{{ entry.rank }}</span>
          <span :class="entry.isMe ? 'font-semibold' : ''">{{ entry.username }}</span>
          <span v-if="entry.isMe" class="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">Vous</span>
        </div>
        <div class="text-right">
          <span class="font-semibold">{{ entry.score }} pts</span>
          <span class="text-xs text-gray-500 ml-2">🔥{{ entry.streak }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
