<template>
    <div class="min-h-screen bg-gray-100 font-sans pb-24">

        <AppHeader />

        <main class="px-4 w-full max-w-lg mx-auto">

            <h1 class="text-3xl text-center my-6 font-power">
                Journaux
            </h1>

            <!-- La grille autonome -->
            <StoriesJournalGrid />

        </main>

        <!-- L'overlay s'affichera ici -->
        <NuxtPage />
    </div>
</template>
