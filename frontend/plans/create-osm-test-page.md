# Implementation Plan - Create OSM Test Page

## 1. 🔍 Analysis & Context
*   **Objective:** Create a new test page in the Nuxt application that displays an OpenStreetMap map centered on Saint-Lô, France, with a marker.
*   **Affected Files:** 
    *   `app/pages/tests/osm-test.vue` (New file)
*   **Key Dependencies:** 
    *   `@nuxtjs/leaflet` (Already installed and registered in `nuxt.config.ts`)
*   **Risks/Unknowns:** 
    *   Leaflet requires the `window` object, so components must be wrapped in `<ClientOnly>`.
    *   CSS for Leaflet might need to be explicitly loaded if the module doesn't handle it automatically.

## 2. 📋 Checklist
- [x] Step 1: Create the `osm-test.vue` page.
- [x] Step 2: Implement the map using `@nuxtjs/leaflet` components.
- [x] Step 3: Add the marker on Saint-Lô coordinates.
- [x] Step 4: Replace default marker with custom icon `/assets/poi.png`.
- [ ] Verification: Access `/tests/osm-test` and verify the map and custom marker.

## 3. 📝 Step-by-Step Implementation Details

### Step 1: Create the test page
*   **Goal:** Create `app/pages/tests/osm-test.vue` with the necessary template and script.
*   **Action:**
    *   Create `app/pages/tests/osm-test.vue`.
    *   Add `<template>` with `<LMap>`, `<LTileLayer>`, and `<LMarker>`.
    *   Wrap map components in `<ClientOnly>`.
    *   Set the center and marker position to `[49.1167, -1.0833]`.
    *   Define page meta to use the `test` layout.
*   **Verification:** Ensure the file exists and has the correct coordinates.

### Step 4: Add custom icon
*   **Goal:** Use `/assets/poi.png` as the marker icon.
*   **Action:**
    *   Use `<LIcon>` inside `<LMarker>`.
    *   Set `icon-url` to `/assets/poi.png`.

## 4. 🧪 Testing Strategy
*   **Manual Verification:**
    1.  Start the development server: `npm run dev`.
    2.  Navigate to `http://localhost:3000/tests/osm-test`.
    3.  Verify that the map is displayed.
    4.  Verify that the map is centered on Saint-Lô.
    5.  Verify that a custom marker (chest icon) is present on Saint-Lô.

## 5. ✅ Success Criteria
*   The page `/tests/osm-test` is accessible.
*   A functional OpenStreetMap map is visible.
*   The map is centered on Saint-Lô (`[49.1167, -1.0833]`).
*   A custom marker is placed exactly on the center point.
