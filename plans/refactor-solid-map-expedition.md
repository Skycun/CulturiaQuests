# Implementation Plan - SOLID Refactoring of Map, Expedition & Chest Systems

## 1. 🔍 Analysis & Context
*   **Objective:** Refactor the Map, Expedition, and Chest systems to adhere to SOLID principles, specifically separating concerns (SRP), decoupling API logic (DIP), and centralizing domain logic.
*   **Affected Files:**
    *   `frontend/app/pages/map.vue`
    *   `frontend/app/pages/expedition.vue`
    *   `frontend/app/pages/chest.vue`
    *   `frontend/app/stores/*.ts` (run, museum, poi, visit)
    *   `frontend/app/composables/useExpeditionLogic.js`
*   **Key Dependencies:** `pinia`, `nuxt`, `@nuxtjs/strapi` (via client).
*   **Risks/Unknowns:**
    *   Moving API logic might break existing data normalization if not careful.
    *   `useExpeditionLogic.js` is currently JS, should be upgraded to TS.

## 2. 📋 Checklist
- [ ] Step 1: Create Domain Services (Calculators)
- [ ] Step 2: Implement Repository Pattern (API Layer)
- [ ] Step 3: Refactor Stores to use Repositories
- [ ] Step 4: Refactor Expedition Page (Logic Extraction)
- [ ] Step 5: Refactor Map Page (Composable Extraction)
- [ ] Verification

## 3. 📝 Step-by-Step Implementation Details

### Step 1: Create Domain Services (Calculators)
*   **Goal:** Extract business logic (Tier calculation, Damage calculation) out of components and composables into pure TypeScript domain services.
*   **Action:**
    *   Create `frontend/app/services/calculator/TierCalculator.ts`.
        *   Move the "Infinite Tier Calculation" logic from `useExpeditionLogic.js` here.
        *   Function: `calculateTier(dps: number, durationSeconds: number): TierInfo`.
    *   Create `frontend/app/services/calculator/DamageCalculator.ts`.
        *   Move `SYNERGY_BONUS` constant here.
        *   Function: `calculateGlobalMultiplier(matchCount: number): number`.
    *   Create `frontend/app/services/formatter/NumberFormatter.ts`.
        *   Move `formatNumber` logic here.
*   **Verification:** Verify that `useExpeditionLogic.js` can import and use these services (after we convert it to TS in Step 4).

### Step 2: Implement Repository Pattern (API Layer)
*   **Goal:** Decouple Pinia stores from direct Strapi API calls (DIP).
*   **Action:**
    *   Create `frontend/app/repositories/MuseumRepository.ts`.
        *   Move `fetchNearby` and `fetchAll` API calls here.
        *   Should accept `client` as dependency or use `useStrapiClient` internally if Nuxt context allows (prefer passing client for testability).
    *   Create `frontend/app/repositories/RunRepository.ts`.
        *   Methods: `fetchActive`, `startExpedition`, `endExpedition`.
    *   Create `frontend/app/repositories/POIRepository.ts`.
    *   Create `frontend/app/repositories/VisitRepository.ts`.
        *   Method: `openChest`.
*   **Verification:** Ensure repositories return raw or slightly normalized data, leaving state management to stores.

### Step 3: Refactor Stores to use Repositories
*   **Goal:** Stores should only manage state, not how to fetch it.
*   **Action:**
    *   Modify `frontend/app/stores/museum.ts`: Import `MuseumRepository` and use it.
    *   Modify `frontend/app/stores/run.ts`: Import `RunRepository`.
    *   Modify `frontend/app/stores/poi.ts`: Import `POIRepository`.
    *   Modify `frontend/app/stores/visit.ts`: Import `VisitRepository`.
*   **Verification:** Run the app. The Map and Expedition pages should still load data correctly.

### Step 4: Refactor Expedition Page & Logic
*   **Goal:** Clean up `expedition.vue` and `useExpeditionLogic.js`.
*   **Action:**
    *   Rename `frontend/app/composables/useExpeditionLogic.js` to `frontend/app/composables/useExpeditionLogic.ts` (convert to TS).
    *   Update `useExpeditionLogic.ts` to use `TierCalculator` and `DamageCalculator` created in Step 1.
    *   Create `frontend/app/composables/useExpeditionTimer.ts`.
        *   Extract the `setInterval` / `secondsElapsed` logic from `expedition.vue`.
    *   Update `frontend/app/pages/expedition.vue`:
        *   Use `useExpeditionTimer`.
        *   Remove local calculations.
*   **Verification:** Check the expedition page. The timer should tick, and tiers should calculate correctly.

### Step 5: Refactor Map Page (Composable Extraction)
*   **Goal:** De-clutter `map.vue` (SRP).
*   **Action:**
    *   Create `frontend/app/composables/useMapSelection.ts`.
        *   Move `selectedItem`, `isDrawerOpen`, `selectItem`, `validMuseums`, `validPOIs` logic here.
    *   Create `frontend/app/composables/useExpeditionManager.ts`.
        *   Move `handleStartExpedition` logic here (handling the redirect to NPC vs Expedition).
    *   Update `frontend/app/pages/map.vue`:
        *   Import and use these new composables.
        *   The script section should be significantly smaller.
*   **Verification:** Navigate the map, select items, and start an expedition. Behavior should be identical.

## 4. 🧪 Testing Strategy
*   **Manual Verification:**
    *   **Map:** Load map, check markers, click marker (drawer opens), click "Start Expedition".
    *   **Expedition:** Verify timer counts up, Tier updates dynamically.
    *   **Chest:** Open a chest, verify animation and loot display.
*   **Refactoring Safety:** Since this is a refactor, "Success" means "Nothing changed in user behavior".

## 5. ✅ Success Criteria
*   `map.vue` script section is under 100 lines (excluding imports).
*   No `setInterval` in UI components (moved to composables).
*   No `useStrapiClient` directly in Stores (moved to Repositories).
*   Complex math (Tiers/Damage) is in `services/`.
