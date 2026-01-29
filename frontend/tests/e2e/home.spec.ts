import { test, expect } from '@playwright/test'

test.describe('Page d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('doit afficher le titre principal', async ({ page }) => {
    const title = page.locator('h1')
    await expect(title).toBeVisible()
    await expect(title).toContainText('Culturia Quests')
  })

  test('doit afficher le message de bienvenue', async ({ page }) => {
    const welcomeText = page.locator('p')
    await expect(welcomeText).toContainText('Bienvenue')
  })

  test('doit avoir un bouton de connexion', async ({ page }) => {
    const loginButton = page.locator('text=Se connecter')
    await expect(loginButton).toBeVisible()
  })

  test('doit avoir un bouton d\'inscription', async ({ page }) => {
    const registerButton = page.locator('text=S\'inscrire')
    await expect(registerButton).toBeVisible()
  })

  test('le bouton de connexion doit rediriger vers /account/login', async ({ page }) => {
    await page.click('text=Se connecter')
    await expect(page).toHaveURL('/account/login')
  })

  test('le bouton d\'inscription doit rediriger vers /account/register', async ({ page }) => {
    await page.click('text=S\'inscrire')
    await expect(page).toHaveURL('/account/register')
  })
})
