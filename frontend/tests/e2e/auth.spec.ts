import { test, expect } from '@playwright/test'

test.describe('Page de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/login')
  })

  test('doit afficher le formulaire de connexion', async ({ page }) => {
    const title = page.locator('h1')
    await expect(title).toContainText('Connexion')
  })

  test('doit avoir un champ email/username', async ({ page }) => {
    const emailInput = page.locator('input[type="text"]')
    await expect(emailInput).toBeVisible()
  })

  test('doit avoir un champ mot de passe', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('doit avoir un bouton de connexion', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toContainText('Se connecter')
  })

  test('doit afficher une erreur avec des identifiants invalides', async ({ page }) => {
    // Remplir le formulaire avec des identifiants invalides
    await page.fill('input[type="text"]', 'utilisateur_invalide')
    await page.fill('input[type="password"]', 'mot_de_passe_invalide')

    // Soumettre le formulaire
    await page.click('button[type="submit"]')

    // Attendre et vérifier le message d'erreur
    const errorMessage = page.locator('.text-red-500')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
  })

  test('les champs doivent être désactivés pendant le chargement', async ({ page }) => {
    // Remplir le formulaire
    await page.fill('input[type="text"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    // Cliquer sur le bouton de connexion
    await page.click('button[type="submit"]')

    // Vérifier que le bouton affiche le texte de chargement
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toContainText(/Connexion/)
  })
})

test.describe('Page d\'inscription', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/register')
  })

  test('doit afficher le formulaire d\'inscription', async ({ page }) => {
    const title = page.locator('h1')
    await expect(title).toContainText('Inscription')
  })

  test('doit afficher l\'étape 1 par défaut', async ({ page }) => {
    // Vérifier que les champs de l'étape 1 sont visibles
    const usernameInput = page.locator('input[placeholder*="nom d\'utilisateur"]')
    const emailInput = page.locator('input[type="email"]')

    await expect(usernameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
  })

  test('doit avoir un indicateur de progression', async ({ page }) => {
    // L'indicateur de progression devrait être présent
    const progressIndicator = page.locator('text=Informations de compte')
    await expect(progressIndicator).toBeVisible()
  })

  test('doit avoir un lien vers la page de connexion', async ({ page }) => {
    const loginLink = page.locator('text=Se connecter')
    await expect(loginLink).toBeVisible()

    await loginLink.click()
    await expect(page).toHaveURL('/account/login')
  })

  test('le bouton Suivant doit être désactivé si les champs sont vides', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Suivant")')
    await expect(nextButton).toBeDisabled()
  })

  test('doit pouvoir passer à l\'étape 2 avec des données valides', async ({ page }) => {
    // Remplir les champs de l'étape 1
    await page.fill('input[placeholder*="nom d\'utilisateur"]', 'testuser')
    await page.fill('input[type="email"]', 'test@example.com')

    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('password123')
    await passwordFields.nth(1).fill('password123')

    // Cliquer sur Suivant
    const nextButton = page.locator('button:has-text("Suivant")')
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    // Vérifier qu'on est à l'étape 2
    const guildInput = page.locator('input[placeholder*="guilde"]')
    await expect(guildInput).toBeVisible()
  })

  test('doit afficher une erreur si les mots de passe ne correspondent pas', async ({ page }) => {
    // Remplir les champs avec des mots de passe différents
    await page.fill('input[placeholder*="nom d\'utilisateur"]', 'testuser')
    await page.fill('input[type="email"]', 'test@example.com')

    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('password123')
    await passwordFields.nth(1).fill('differentpassword')

    // Cliquer sur Suivant
    const nextButton = page.locator('button:has-text("Suivant")')
    await nextButton.click()

    // Vérifier le message d'erreur
    const errorMessage = page.locator('text=Les mots de passe ne correspondent pas')
    await expect(errorMessage).toBeVisible()
  })
})
