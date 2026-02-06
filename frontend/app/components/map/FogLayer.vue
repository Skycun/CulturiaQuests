<template>
  <div style="display: none;"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useFogStore } from '~/stores/fog'
import { useZoneStore } from '~/stores/zone'
import { useProgressionStore } from '~/stores/progression'
import type { Map } from 'leaflet'
import L from 'leaflet'

const props = defineProps<{
  map: any // Instance L.Map
}>()

const fogStore = useFogStore()
const zoneStore = useZoneStore()
const progressionStore = useProgressionStore()

const canvas = ref<HTMLCanvasElement | null>(null)
let fogPane: HTMLElement | null = null

// --- CONFIGURATION ---
const CONFIG = {
  RADIUS_METERS: 100,
  OPACITY: 0.95,
  COLOR: '210, 215, 220',
  BG_COLOR: 'rgba(190, 195, 200, 0.3)'
}

// --- ÉTAT INTERNE ---
let cloudPattern: CanvasPattern | null = null
let brushCanvas: HTMLCanvasElement | null = null
let lastZoomForBrush = -1

// --- GÉNÉRATEURS ---

const createCloudPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const size = 512
  const cvs = document.createElement('canvas')
  cvs.width = size
  cvs.height = size
  const pCtx = cvs.getContext('2d', { alpha: true })
  if (!pCtx) return null

  pCtx.fillStyle = CONFIG.BG_COLOR
  pCtx.fillRect(0, 0, size, size)

  const puffCount = 400
  for (let i = 0; i < puffCount; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 30 + Math.random() * 50
    const op = 0.3 + Math.random() * 0.4

    const g = pCtx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${CONFIG.COLOR}, ${op})`)
    g.addColorStop(1, `rgba(${CONFIG.COLOR}, 0)`)
    
    pCtx.fillStyle = g
    pCtx.beginPath()
    pCtx.arc(x, y, r, 0, Math.PI * 2)
    pCtx.fill()

    const offset = (ox: number, oy: number) => {
      pCtx.fillStyle = g
      pCtx.beginPath()
      pCtx.arc(x + ox, y + oy, r, 0, Math.PI * 2)
      pCtx.fill()
    }
    
    if (x - r < 0) offset(size, 0)
    if (x + r > size) offset(-size, 0)
    if (y - r < 0) offset(0, size)
    if (y + r > size) offset(0, -size)
  }

  return ctx.createPattern(cvs, 'repeat')
}

const updateBrush = (zoom: number, centerLat: number): HTMLCanvasElement => {
  const metersPerPixel = 40075016.686 * Math.abs(Math.cos(centerLat * Math.PI / 180)) / Math.pow(2, zoom + 8)
  const radiusPx = Math.ceil(CONFIG.RADIUS_METERS / metersPerPixel)
  const diameter = radiusPx * 2
  
  const cvs = document.createElement('canvas')
  cvs.width = diameter
  cvs.height = diameter
  const ctx = cvs.getContext('2d')
  if (!ctx) return cvs

  const g = ctx.createRadialGradient(radiusPx, radiusPx, radiusPx * 0.5, radiusPx, radiusPx, radiusPx)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')

  ctx.fillStyle = g
  ctx.fillRect(0, 0, diameter, diameter)
  return cvs
}

// --- GEOMETRY HELPERS ---

const projectRing = (ctx: CanvasRenderingContext2D, coords: any[], map: Map) => {
  if (coords.length === 0) return
  const start = map.latLngToContainerPoint([coords[0][1], coords[0][0]]) // [lng, lat] -> [lat, lng]
  ctx.moveTo(start.x, start.y)
  
  for (let i = 1; i < coords.length; i++) {
    const p = map.latLngToContainerPoint([coords[i][1], coords[i][0]])
    ctx.lineTo(p.x, p.y)
  }
}

const drawGeometry = (ctx: CanvasRenderingContext2D, geometry: any, map: Map) => {
  if (!geometry) return

  ctx.beginPath() // Un seul path pour toute la géométrie
  if (geometry.type === 'Polygon') {
    // Outer ring
    projectRing(ctx, geometry.coordinates[0], map)
    ctx.closePath()
    // Holes (Leaflet/Canvas gère les trous avec la règle evenodd/nonzero si on trace tout dans le même path)
    for (let i = 1; i < geometry.coordinates.length; i++) {
      projectRing(ctx, geometry.coordinates[i], map)
      ctx.closePath()
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      projectRing(ctx, poly[0], map)
      ctx.closePath()
      for (let i = 1; i < poly.length; i++) {
        projectRing(ctx, poly[i], map)
        ctx.closePath()
      }
    }
  }
  ctx.fill() // Remplir (Gommer)
}

// --- RENDU ---

const drawFog = () => {
  if (!props.map || !canvas.value || !fogPane) return
  
  const map = props.map as Map
  const ctx = canvas.value.getContext('2d', { desynchronized: true })
  if (!ctx) return

  if (!cloudPattern) cloudPattern = createCloudPattern(ctx)

  const size = map.getSize()
  const topLeft = map.containerPointToLayerPoint([0, 0])
  L.DomUtil.setPosition(canvas.value, topLeft)
  
  if (canvas.value.width !== size.x || canvas.value.height !== size.y) {
    canvas.value.width = size.x
    canvas.value.height = size.y
  }

  // 1. Fond complet (Brouillard partout)
  ctx.clearRect(0, 0, size.x, size.y)
  ctx.globalCompositeOperation = 'source-over'
  
  if (cloudPattern) {
    const mat = new DOMMatrix().translate(-topLeft.x, -topLeft.y).scale(0.5)
    cloudPattern.setTransform(mat)
    ctx.fillStyle = cloudPattern
    ctx.globalAlpha = CONFIG.OPACITY
    ctx.fillRect(0, 0, size.x, size.y)
  }

  // 2. Mode Gomme
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = 1.0
  ctx.fillStyle = 'rgba(0,0,0,1)' // Couleur de gomme pleine

  // 3. Gommage des Zones Complétées
  const zoom = map.getZoom()
  const visibleZones = zoneStore.getZonesForZoom(zoom)
  
  // Helper pour vérifier la progression
  const isCompleted = (zone: any) => {
    const id = zone.documentId || zone.id
    
    // DEBUG TEMPORAIRE
    /*
    if (zoom < 8) {
       console.log('--- DEBUG FOG ---')
       console.log('Zone ID:', id)
       // @ts-ignore
       console.log('Completed Regions (Set):', Array.from(progressionStore.completedRegionIds))
       console.log('Is Completed?', progressionStore.isRegionCompleted(id))
    }
    */

    if (zoom >= 10) return progressionStore.isComcomCompleted(id)
    if (zoom >= 8) return progressionStore.isDepartmentCompleted(id)
    return progressionStore.isRegionCompleted(id)
  }

  // On dessine les polygones des zones complétées pour les "trouer"
  for (const zone of visibleZones) {
    if (isCompleted(zone)) {
      drawGeometry(ctx, zone.geometry, map)
    }
  }

  // 4. Gommage des Points GPS (Classique)
  if (!brushCanvas || zoom !== lastZoomForBrush) {
    brushCanvas = updateBrush(zoom, map.getCenter().lat)
    lastZoomForBrush = zoom
  }

  if (brushCanvas) {
    const bounds = map.getBounds().pad(0.2)
    const points = fogStore.discoveredPoints
    const radiusOffset = brushCanvas.width / 2

    for (let i = 0; i < points.length; i++) {
      const pt = points[i]
      if (!bounds.contains([pt.lat, pt.lng])) continue

      const p = map.latLngToContainerPoint([pt.lat, pt.lng])
      ctx.drawImage(brushCanvas, p.x - radiusOffset, p.y - radiusOffset)
    }
  }
}

// --- LIFECYCLE ---

onMounted(() => {
  if (!props.map) return
  const map = props.map as Map

  if (!map.getPane('fogPane')) {
    fogPane = map.createPane('fogPane')
    fogPane.style.zIndex = '300'
    fogPane.style.pointerEvents = 'none'
  } else {
    fogPane = map.getPane('fogPane')
  }

  const cvs = document.createElement('canvas')
  cvs.className = 'leaflet-zoom-animated'
  fogPane?.appendChild(cvs)
  canvas.value = cvs

  map.on('moveend zoomend resize', drawFog)
  drawFog()
})

onUnmounted(() => {
  if (props.map) {
    const map = props.map as Map
    map.off('moveend zoomend resize', drawFog)
    if (canvas.value && fogPane) fogPane.removeChild(canvas.value)
  }
})

// Réactivité
watch(() => fogStore.discoveredPoints.length, drawFog)
watch(() => zoneStore.isInitialized, drawFog)
watch(() => progressionStore.progressions.length, drawFog)
</script>
