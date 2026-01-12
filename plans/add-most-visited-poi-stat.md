# Implementation Plan - Add "Most Visited POI" to Guild Statistics

## 1. 🔍 Analysis & Context
*   **Objective:** Display the name of the Point of Interest (POI) that the guild has visited the most frequently on the Guild Statistics page.
*   **Affected Files:**
    *   `backend/src/api/statistic/services/statistic.ts`
    *   `frontend/app/stores/statistics.ts`
    *   `frontend/app/pages/guild.vue`
*   **Key Dependencies:** Strapi Backend (Service layer), Pinia (Frontend State), Vue 3 (Frontend UI).
*   **Risks/Unknowns:** Minimal risk. Assumes `visit` entities are unique per POI-Guild pair (which `open_count` usage implies). Performance impact is negligible as the number of visited POIs per guild is not massive.

## 2. 📋 Checklist
- [x] Step 1: Backend - Calculate `mostVisitedPoiName` in Statistics Service
    *   Status: ✅ Implemented in `backend/src/api/statistic/services/statistic.ts`
- [x] Step 2: Frontend - Update Statistics Store to Handle New Field
    *   Status: ✅ Implemented in `frontend/app/stores/statistics.ts`
- [x] Step 3: Frontend - Display New Statistic in Guild Page
    *   Status: ✅ Implemented in `frontend/app/pages/guild.vue`
- [ ] Verification

## 3. 📝 Step-by-Step Implementation Details

### Step 1: Backend - Calculate `mostVisitedPoiName` in Statistics Service
*   **Goal:** Modify the backend service to retrieve the POI name for the visit with the highest `open_count` using Strapi's query sorting and limiting.
*   **Action:**
    *   Modify `backend/src/api/statistic/services/statistic.ts`:
        *   Add a new query to the `Promise.all` block:
            ```typescript
            strapi.db.query('api::visit.visit').findMany({
              where: { guild: guildId },
              orderBy: { open_count: 'desc' },
              limit: 1,
              populate: { poi: { select: ['name'] } }
            })
            ```
        *   Extract the name from the first element of the result (if it exists).
        *   Add `mostVisitedPoiName` to the returned statistics object.
*   **Verification:** Check that the `/statistics/summary` API response includes the new field.

### Step 2: Frontend - Update Statistics Store to Handle New Field
*   **Goal:** Update the Pinia store to store and expose the `mostVisitedPoiName`.
*   **Action:**
    *   Modify `frontend/app/stores/statistics.ts`:
        *   Update `GuildStatistics` interface to include `mostVisitedPoiName: string | null`.
        *   Add `const mostVisitedPoiName = ref<string | null>(null)` to the state.
        *   In `fetchStatistics`, map `data.mostVisitedPoiName` to the state variable.
        *   Return `mostVisitedPoiName` from the store.

### Step 3: Frontend - Display New Statistic in Guild Page
*   **Goal:** Render the "POI le plus visité" statistic in the UI.
*   **Action:**
    *   Modify `frontend/app/pages/guild.vue`:
        *   In `displayStats` computed property, add a new object:
            ```typescript
            {
                icon: 'game-icons:hanging-sign',
                label: 'POI le plus visité',
                value: statsStore.mostVisitedPoiName || 'Aucun',
            }
            ```

## 4. 🧪 Testing Strategy
*   **Manual Verification:**
    1.  Log in to the application.
    2.  Navigate to the Guild page.
    3.  Check the "Statistiques" section.
    4.  Verify that "Lieu favori" (or "POI le plus visité") appears.
    5.  If the user has visits, ensure a name is displayed.
    6.  If possible, verify against the database (find the visit with max open_count for that user's guild).

## 5. ✅ Success Criteria
*   The API `/statistics/summary` returns a `mostVisitedPoiName` field.
*   The Guild page displays the "Lieu favori" statistic with the correct name.
*   The application builds and runs without errors.
