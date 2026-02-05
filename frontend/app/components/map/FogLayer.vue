<template>
  <div style="display: none;"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useFogStore } from '~/stores/fog'
import type { Map } from 'leaflet'
import L from 'leaflet'

const props = defineProps<{
  map: any // Instance L.Map
}>()

const fogStore = useFogStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let fogPane: HTMLElement | null = null

// --- CONFIGURATION ---
const CONFIG = {
  RADIUS_METERS: 100, // Doublé (50 -> 100)
  OPACITY: 0.95,      // Plus opaque (0.90 -> 0.95)
  COLOR: '210, 215, 220', // Gris bleuté
  BG_COLOR: 'rgba(190, 195, 200, 0.3)'
}

// --- ÉTAT INTERNE ---
let cloudPattern: CanvasPattern | null = null
let brushCanvas: HTMLCanvasElement | null = null
let lastZoomForBrush = -1

// --- GÉNÉRATEURS (Pure Functions) ---

/**
 * Génère la texture de nuages (Exécuté 1 seule fois)
 */
const createCloudPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const size = 512
  const cvs = document.createElement('canvas')
  cvs.width = size
  cvs.height = size
  const pCtx = cvs.getContext('2d', { alpha: true })
  if (!pCtx) return null

  // Fond
  pCtx.fillStyle = CONFIG.BG_COLOR
  pCtx.fillRect(0, 0, size, size)

  // Bouffées
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

    // Seamless logic (Tiling simple)
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

/**
 * Crée le "Tampon" de gommage pour un niveau de zoom donné (Optimisation Perf)
 * Évite de recalculer le gradient radial pour chaque point à chaque frame.
 */
const updateBrush = (zoom: number, centerLat: number): HTMLCanvasElement => {
  const metersPerPixel = 40075016.686 * Math.abs(Math.cos(centerLat * Math.PI / 180)) / Math.pow(2, zoom + 8)
  const radiusPx = Math.ceil(CONFIG.RADIUS_METERS / metersPerPixel)
  const diameter = radiusPx * 2
  
  // Création ou réutilisation d'un canvas offscreen
  const cvs = document.createElement('canvas')
  cvs.width = diameter
  cvs.height = diameter
  const ctx = cvs.getContext('2d')
  if (!ctx) return cvs

  // Dessin du gradient unique ("Le Tampon")
  const g = ctx.createRadialGradient(radiusPx, radiusPx, radiusPx * 0.5, radiusPx, radiusPx, radiusPx)
  g.addColorStop(0, 'rgba(0,0,0,1)') // Centre (gomme forte)
  g.addColorStop(1, 'rgba(0,0,0,0)') // Bord (gomme nulle)

  ctx.fillStyle = g
  ctx.fillRect(0, 0, diameter, diameter)
  
  return cvs
}

// --- MOTEUR DE RENDU ---

const drawFog = () => {
  if (!props.map || !canvas.value || !fogPane) return
  
  const map = props.map as Map
  const ctx = canvas.value.getContext('2d', { desynchronized: true }) // Hint pour perf
  if (!ctx) return

  // 1. Initialisation Lazy
  if (!cloudPattern) cloudPattern = createCloudPattern(ctx)

  // 2. Géométrie
  const size = map.getSize()
  const topLeft = map.containerPointToLayerPoint([0, 0])
  L.DomUtil.setPosition(canvas.value, topLeft)
  
  if (canvas.value.width !== size.x || canvas.value.height !== size.y) {
    canvas.value.width = size.x
    canvas.value.height = size.y
  }

  // 3. Dessin du Brouillard (Couche 1)
  ctx.clearRect(0, 0, size.x, size.y)
  ctx.globalCompositeOperation = 'source-over'
  
  if (cloudPattern) {
    const mat = new DOMMatrix().translate(-topLeft.x, -topLeft.y).scale(0.5)
    cloudPattern.setTransform(mat)
    ctx.fillStyle = cloudPattern
    ctx.globalAlpha = CONFIG.OPACITY
    ctx.fillRect(0, 0, size.x, size.y)
  }

  // 4. Gommage (Couche 2)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = 1.0

  // Mise à jour du Tampon si le zoom a changé
  const zoom = map.getZoom()
  if (!brushCanvas || zoom !== lastZoomForBrush) {
    brushCanvas = updateBrush(zoom, map.getCenter().lat)
    lastZoomForBrush = zoom
  }

  if (!brushCanvas) return

  // Optimisation Culling (Bornes + Marge)
  const bounds = map.getBounds().pad(0.2)
  const points = fogStore.discoveredPoints
  const radiusOffset = brushCanvas.width / 2

  // Boucle optimisée : Tamponnage
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    if (!bounds.contains([pt.lat, pt.lng])) continue

    const p = map.latLngToContainerPoint([pt.lat, pt.lng])
    
    // On dessine l'image pré-calculée au lieu de générer un gradient
    ctx.drawImage(brushCanvas, p.x - radiusOffset, p.y - radiusOffset)
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

  map.on('move moveend zoom zoomend resize', drawFog)
  drawFog()
})

onUnmounted(() => {
  if (props.map) {
    const map = props.map as Map
    map.off('move moveend zoom zoomend resize', drawFog)
    if (canvas.value && fogPane) fogPane.removeChild(canvas.value)
  }
})

watch(() => fogStore.discoveredPoints.length, drawFog)
</script>
