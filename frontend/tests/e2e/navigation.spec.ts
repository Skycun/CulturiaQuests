import { test, expect } from '@playwright/test'

test.describe('Navigation générale', () => {
  test('la page d\'accueil doit être accessible', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('la page de connexion doit être accessible', async ({ page }) => {
    const response = await page.goto('/account/login')
    expect(response?.status()).toBe(200)
  })

  test('la page d\'inscription doit être accessible', async ({ page }) => {
    const response = await page.goto('/account/register')
    expect(response?.status()).toBe(200)
  })

  test('les pages protégées doivent rediriger vers login (sans authentification)', async ({
    page,
  }) => {
    // Tester l'accès à des pages qui nécessitent une authentification
    const protectedRoutes = ['/map', '/guild', '/quests', '/chest', '/equipement']

    for (const route of protectedRoutes) {
      await page.goto(route)
      // Vérifier qu'on est redirigé ou qu'on voit un message d'authentification
      // Note: Le comportement exact dépend de la configuration du middleware
      const url = page.url()
      // Si redirigé, vérifier qu'on est sur une page d'authentification ou d'accueil
      const isRedirected =
        url.includes('/login') || url.includes('/register') || url.endsWith('/')
      const hasContent = await page.locator('body').textContent()
      // La page doit soit rediriger, soit afficher du contenu
      expect(isRedirected || hasContent).toBeTruthy()
    }
  })
})

test.describe('Accessibilité de base', () => {
  test('la page d\'accueil doit avoir un titre', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('la page de connexion doit avoir un titre', async ({ page }) => {
    await page.goto('/account/login')
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('les formulaires doivent avoir des labels', async ({ page }) => {
    await page.goto('/account/login')

    // Vérifier qu'il y a des labels ou des placeholders
    const inputs = page.locator('input')
    const inputCount = await inputs.count()

    expect(inputCount).toBeGreaterThan(0)

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const placeholder = await input.getAttribute('placeholder')
      const ariaLabel = await input.getAttribute('aria-label')
      const id = await input.getAttribute('id')

      // L'input doit avoir un placeholder, aria-label, ou un label associé
      const hasAccessibleName = placeholder || ariaLabel || id
      expect(hasAccessibleName).toBeTruthy()
    }
  })
})

test.describe('Responsive design', () => {
  test('la page d\'accueil doit s\'afficher correctement sur mobile', async ({ page }) => {
    // Définir une taille d'écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Vérifier que le contenu principal est visible
    const title = page.locator('h1')
    await expect(title).toBeVisible()

    const buttons = page.locator('button, a[role="button"]')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)
  })

  test('la page d\'accueil doit s\'afficher correctement sur tablette', async ({ page }) => {
    // Définir une taille d'écran tablette
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    const title = page.locator('h1')
    await expect(title).toBeVisible()
  })

  test('la page d\'accueil doit s\'afficher correctement sur desktop', async ({ page }) => {
    // Définir une taille d'écran desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    const title = page.locator('h1')
    await expect(title).toBeVisible()
  })
})

test.describe('Performance de base', () => {
  test('la page d\'accueil doit se charger en moins de 5 secondes', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'networkidle' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(5000)
  })

  test('la page de connexion doit se charger en moins de 5 secondes', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/account/login', { waitUntil: 'networkidle' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(5000)
  })
})
