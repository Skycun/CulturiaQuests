<template>
  <div class="min-h-screen bg-gray-950 text-white font-onest">
    <!-- Dialogue overlay -->
    <ClientOnly>
      <Dialogue
        :lines="currentLines"
        :npc-firstname="selectedNpc"
        :text-type="selectedType"
        :target-threshold="showThreshold ? targetThreshold : null"
        :visible="showDialogue"
        @complete="onDialogueComplete"
      />
    </ClientOnly>

    <!-- Panneau de contrôle -->
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-indigo-300">Preview Dialogues</h1>
        <button @click="$router.back()" class="text-xs text-gray-500 hover:text-white">← Retour</button>
      </div>

      <!-- Sélection NPC -->
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider mb-1 block">NPC</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="npc in npcs" :key="npc"
            @click="selectedNpc = npc"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
            :class="selectedNpc === npc
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'"
          >
            {{ npc }}
          </button>
        </div>
      </div>

      <!-- Sélection type de dialogue -->
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Type de dialogue</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="type in dialogueTypes" :key="type.id"
            @click="selectedType = type.id"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
            :class="selectedType === type.id
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- Option palier quête -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="showThreshold" type="checkbox" class="accent-indigo-500">
          <span class="text-xs text-gray-400">Afficher palier quête</span>
        </label>
        <input
          v-if="showThreshold"
          v-model.number="targetThreshold"
          type="number"
          class="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
        >
      </div>

      <!-- Boutons de lancement -->
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="launchDialogue"
          class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all"
        >
          Lancer le dialogue
        </button>
        <button
          @click="launchFullFlow"
          class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl text-sm transition-all"
        >
          Flow complet (expédition)
        </button>
      </div>

      <hr class="border-gray-800">

      <!-- Preview NPC image -->
      <div class="flex items-center gap-4 bg-gray-900 rounded-xl p-4">
        <img
          :src="previewImage"
          :alt="selectedNpc"
          class="w-20 h-20 rounded-full object-cover border-2 border-indigo-400"
        >
        <div>
          <p class="font-bold text-indigo-300">{{ selectedNpc }}</p>
          <p class="text-xs text-gray-500">{{ selectedTypeLabel }}</p>
          <p class="text-xs text-gray-600 mt-1">Image: {{ previewImage }}</p>
        </div>
      </div>

      <!-- Preview des lignes -->
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
          Lignes de dialogue ({{ currentLines.length }})
        </label>
        <div class="space-y-2">
          <div
            v-for="(line, i) in currentLines" :key="i"
            class="bg-gray-900 rounded-lg p-3 text-sm text-gray-300 border border-gray-800"
          >
            <span class="text-indigo-400 font-bold mr-2">{{ i + 1 }}.</span>{{ line }}
          </div>
        </div>
      </div>
    </div>

    <!-- Flow complet : écran NPC post-dialogue -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showFullFlow && !showDialogue"
          class="fixed inset-0 z-[9998] bg-gradient-to-b from-[#040050] to-black flex flex-col text-white"
        >
          <div class="pt-12 px-6 text-center">
            <div class="w-24 h-24 mx-auto mb-4 bg-indigo-900/50 rounded-full flex items-center justify-center border-2 border-indigo-400">
              <img
                :src="`/assets/npc/${selectedNpc}/${selectedNpc}.png`"
                :alt="selectedNpc"
                class="w-full h-full object-cover rounded-full"
              >
            </div>
            <h2 class="font-pixel text-2xl text-indigo-300">{{ selectedNpc }}</h2>
          </div>

          <div class="flex-1 px-6 py-8 flex items-center justify-center">
            <div v-if="showThreshold" class="max-w-md w-full bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">⚔️</span>
                <span class="font-pixel text-yellow-300">Quête disponible</span>
              </div>
              <p class="font-onest text-xs text-yellow-200/80">
                Atteignez le palier {{ targetThreshold }} pour débloquer une récompense spéciale !
              </p>
            </div>
            <div v-else class="text-center text-gray-600">
              <p class="text-sm">Pas de quête cette fois-ci</p>
            </div>
          </div>

          <div class="p-6 bg-gradient-to-t from-black to-transparent space-y-3">
            <button
              class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all"
              @click="showFullFlow = false"
            >
              Commencer l'expédition
            </button>
            <button
              class="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl text-sm transition-all"
              @click="showFullFlow = false"
            >
              Fermer le preview
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'test' })

const EMOTION_MAP: Record<string, string> = {
  quest_description: 'Quest.png',
  expedition_fail: 'Echec.png',
  quest_complete: 'Succes.png'
}

const npcs = ['Bram', 'Denrick', 'Garen', 'Malori', 'Marn', 'Toben', 'Toren']

const dialogueTypes = [
  { id: 'expedition_appear', label: 'Expédition (apparition)' },
  { id: 'expedition_fail', label: 'Expédition (échec)' },
  { id: 'quest_description', label: 'Quête (description)' },
  { id: 'quest_complete', label: 'Quête (complétée)' },
]

const selectedNpc = ref('Bram')
const selectedType = ref('expedition_appear')
const showThreshold = ref(true)
const targetThreshold = ref(15)
const showDialogue = ref(false)
const showFullFlow = ref(false)

const mockDialogues: Record<string, Record<string, string[]>> = {
  expedition_appear: {
    Bram: [
      "Tiens, tiens... [PlayerName], c'est bien ça ?",
      "Ce musée renferme des trésors que peu ont eu le courage d'explorer.",
      "Montrez-moi ce que vous valez. Le palier [DungeonThreshold] vous attend !"
    ],
    Denrick: [
      "Ah, un visiteur ! Ça faisait longtemps...",
      "Les couloirs de ce lieu sont remplis de mystères, [PlayerName].",
      "Êtes-vous prêt à affronter ce qui s'y cache ?"
    ],
    Garen: [
      "Halte ! Qui va là ?",
      "[PlayerName]... Je vous attendais.",
      "Cette expédition ne sera pas de tout repos. Préparez-vous !"
    ],
    Malori: [
      "Oh, quelle belle surprise ! [PlayerName] en personne !",
      "J'ai entendu dire que vous étiez un aventurier redoutable.",
      "Prouvez-le moi en atteignant le palier [DungeonThreshold] !"
    ],
    Marn: [
      "Bienvenue dans mon domaine, [PlayerName].",
      "Peu de gens osent s'aventurer ici...",
      "Voyons si vous faites partie des plus braves."
    ],
    Toben: [
      "Hey ! Vous là-bas !",
      "[PlayerName], c'est ça ? On m'a parlé de vous.",
      "Allez, montrez-moi ce que vous savez faire !"
    ],
    Toren: [
      "Le vent murmure votre nom, [PlayerName]...",
      "Les étoiles annoncent un grand défi pour vous aujourd'hui.",
      "Acceptez-vous de relever le défi du palier [DungeonThreshold] ?"
    ],
  },
  expedition_fail: {
    Bram: [
      "Hmm... Ce n'était pas suffisant, [PlayerName].",
      "Ne vous découragez pas. Revenez plus fort la prochaine fois."
    ],
    Denrick: [
      "Aïe... Ça n'a pas été cette fois-ci.",
      "Mais ne baissez pas les bras, [PlayerName]. Chaque échec est une leçon."
    ],
    Garen: [
      "Vous avez échoué, [PlayerName].",
      "Mais un vrai guerrier se relève toujours. Revenez me voir."
    ],
    Malori: [
      "Oh non... Ce n'est pas grave, [PlayerName] !",
      "La prochaine fois sera la bonne, j'en suis sûre !"
    ],
    Marn: [
      "La défaite a un goût amer, n'est-ce pas ?",
      "Entraînez-vous et revenez, [PlayerName]."
    ],
    Toben: [
      "Pas de chance cette fois, [PlayerName] !",
      "Mais hey, on apprend de ses erreurs, pas vrai ?"
    ],
    Toren: [
      "Les étoiles n'étaient pas alignées pour vous aujourd'hui...",
      "Patience, [PlayerName]. Votre heure viendra."
    ],
  },
  quest_description: {
    Bram: [
      "J'ai une mission spéciale pour vous, [PlayerName].",
      "Un artefact ancien a été repéré dans les environs.",
      "Trouvez-le et rapportez-le moi. La récompense sera à la hauteur !"
    ],
    Denrick: [
      "[PlayerName], j'ai besoin de votre aide.",
      "Des documents historiques ont été éparpillés dans la région.",
      "Rassemblez-les pour moi, voulez-vous ?"
    ],
    Garen: [
      "Soldat [PlayerName], j'ai un ordre de mission pour vous.",
      "Une relique de guerre doit être sécurisée.",
      "C'est une mission de la plus haute importance !"
    ],
    Malori: [
      "Oh [PlayerName], j'ai trouvé quelque chose d'incroyable !",
      "Un vieux grimoire parle d'un trésor caché pas loin d'ici.",
      "On y va ensemble ? Enfin... vous devant, moi je regarde !"
    ],
    Marn: [
      "Une quête vous attend, [PlayerName].",
      "Les anciens parlent d'un lieu sacré dans cette zone.",
      "Explorez-le et percez ses secrets."
    ],
    Toben: [
      "Yo [PlayerName] ! J'ai un truc cool pour vous !",
      "On m'a parlé d'un objet rare dans le coin.",
      "Premier arrivé, premier servi ! Enfin... c'est pour vous."
    ],
    Toren: [
      "Les astres m'ont révélé une quête pour vous, [PlayerName].",
      "Un ancien pouvoir sommeille non loin d'ici.",
      "Seul un esprit éclairé pourra le réveiller."
    ],
  },
  quest_complete: {
    Bram: [
      "Impressionnant, [PlayerName] !",
      "Vous avez réussi au-delà de mes espérances.",
      "Voici votre récompense bien méritée !"
    ],
    Denrick: [
      "Magnifique travail, [PlayerName] !",
      "Ces documents sont exactement ce qu'il me fallait.",
      "Vous êtes un véritable héros !"
    ],
    Garen: [
      "Mission accomplie, [PlayerName].",
      "Vous avez prouvé votre valeur au combat.",
      "Le royaume vous est reconnaissant."
    ],
    Malori: [
      "Waouh [PlayerName], vous êtes INCROYABLE !",
      "Je savais que vous y arriveriez !",
      "Tenez, prenez cette récompense, vous la méritez !"
    ],
    Marn: [
      "Bien joué, [PlayerName].",
      "Peu auraient pu accomplir cette tâche.",
      "Vous avez gagné mon respect."
    ],
    Toben: [
      "YEAH ! Vous l'avez fait, [PlayerName] !",
      "C'était énorme ! Vraiment du grand art !",
      "Allez, voilà votre butin !"
    ],
    Toren: [
      "Les étoiles avaient vu juste, [PlayerName].",
      "Vous avez accompli votre destinée.",
      "Que cette récompense illumine votre chemin."
    ],
  },
}

const selectedTypeLabel = computed(() =>
  dialogueTypes.find(t => t.id === selectedType.value)?.label ?? ''
)

const currentLines = computed(() => {
  return mockDialogues[selectedType.value]?.[selectedNpc.value]
    ?? mockDialogues[selectedType.value]?.Bram
    ?? ["Dialogue par défaut..."]
})

const previewImage = computed(() => {
  const file = EMOTION_MAP[selectedType.value] || `${selectedNpc.value}.png`
  return `/assets/npc/${selectedNpc.value}/${file}`
})

function launchDialogue() {
  showFullFlow.value = false
  showDialogue.value = true
}

function launchFullFlow() {
  showFullFlow.value = true
  showDialogue.value = true
}

function onDialogueComplete() {
  showDialogue.value = false
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
