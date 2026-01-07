<template>
  <div class="h-[600px] w-full">
    <ClientOnly>
      <LMap
        ref="map"
        :zoom="13"
        :center="[49.1167, -1.0833]"
        :use-global-leaflet="false"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />
        <LMarker
          :lat-lng="[49.1167, -1.0833]"
          @click="() => console.log('Marker Saint-Lô cliqué !')"
        >
          <LIcon
            icon-url="/assets/poi.png"
            :icon-size="[64, 46]"
            :icon-anchor="[23, 46]"
          />
        </LMarker>
        <LMarker :lat-lng="[49.12, -1.0833]">
          <LIcon
            icon-url="/assets/musee.png"
            :icon-size="[54, 46]"
            :icon-anchor="[23, 46]"
          />
        </LMarker>
      </LMap>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'test',
})
</script>
