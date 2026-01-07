# Implementation Plan - Bottom Drawer for OSM Test

## 1. 🔍 Analysis & Context
*   **Objective:** Create a Bottom Drawer component and integrate it into the OSM test page to display location details upon clicking a map marker.
*   **Affected Files:**
    *   `frontend/app/pages/tests/osm-test.vue` (Modification)
    *   `frontend/app/components/BottomDrawer.vue` (Creation)
*   **Key Dependencies:** `vue3-leaflet` (for map interactions), `tailwindcss` (for styling).
*   **Risks/Unknowns:** `z-index` conflict with Leaflet map (Leaflet controls are usually z-1000). Drawer needs higher z-index.

## 2. 📋 Checklist
- [x] Step 1: Create `BottomDrawer.vue` component.
    *   Status: ✅ Implemented in file `frontend/app/components/BottomDrawer.vue`
- [x] Step 2: Integrate `BottomDrawer` into `osm-test.vue` and add interaction logic.
    *   Status: ✅ Implemented in file `frontend/app/pages/tests/osm-test.vue`
- [ ] Verification

## 3. 📝 Step-by-Step Implementation Details

### Step 1: Create BottomDrawer Component
*   **Goal:** Create a reusable bottom sheet component with slide animation.
*   **Action:**
    *   Create `frontend/app/components/BottomDrawer.vue`.
    *   Template structure:
        ```vue
        <template>
          <Teleport to="body">
            <Transition name="fade">
              <div 
                v-if="modelValue" 
                class="fixed inset-0 bg-black/40 z-[1999]"
                @click="$emit('update:modelValue', false)"
              ></div>
            </Transition>
            
            <Transition name="slide-up">
              <div 
                v-if="modelValue" 
                class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-[2000] max-h-[80vh] overflow-y-auto p-6 pb-10"
              >
                <!-- Drag handle visual -->
                <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
                
                <!-- Content -->
                <slot />
              </div>
            </Transition>
          </Teleport>
        </template>
        ```
    *   Script:
        *   Define props: `modelValue: boolean`.
        *   Define emits: `update:modelValue`.
    *   Styles (Scoped CSS):
        *   Define enter/leave classes for `fade` (opacity) and `slide-up` (translate-y).
*   **Verification:** Component exists.

### Step 2: Integrate into OSM Test Page
*   **Goal:** Wire up the map markers to open the drawer with data.
*   **Action:**
    *   Modify `frontend/app/pages/tests/osm-test.vue`.
    *   Imports: Component is auto-imported, but verify logic.
    *   Logic:
        ```typescript
        const selectedItem = ref<LocationItem | null>(null)
        const isDrawerOpen = ref(false)
        
        function selectItem(item: LocationItem) {
          selectedItem.value = item
          isDrawerOpen.value = true
        }
        ```
    *   Template Updates:
        *   Update `<LMarker>` tags:
            ```vue
            <LMarker
              v-for="museum in validMuseums"
              ...
              @click="selectItem(museum)"
            >
            ```
        *   Add `<BottomDrawer>`:
            ```vue
            <BottomDrawer v-model="isDrawerOpen">
              <div v-if="selectedItem">
                <h2 class="text-xl font-bold mb-2">{{ getName(selectedItem) }}</h2>
                <div class="text-gray-600">
                  <p>Type: {{ 'rarity' in selectedItem ? 'Item/POI' : 'Museum' }}</p>
                  <p class="text-sm mt-2">Lat: {{ getLat(selectedItem)?.toFixed(4) }}</p>
                  <p class="text-sm">Lng: {{ getLng(selectedItem)?.toFixed(4) }}</p>
                </div>
              </div>
            </BottomDrawer>
            ```
*   **Verification:** Clicking a marker opens the drawer with correct info.

## 4. 🧪 Testing Strategy
*   **Manual Verification:**
    1.  Open `/tests/osm-test`.
    2.  Click a Museum marker -> Drawer slides up -> Check Name matches.
    3.  Click a POI marker -> Drawer slides up -> Check Name matches.
    4.  Click Background -> Drawer slides down.

## 5. ✅ Success Criteria
*   [ ] `BottomDrawer.vue` is created.
*   [ ] Drawer opens from bottom on marker click in `osm-test.vue`.
*   [ ] Drawer closes when clicking backdrop.
