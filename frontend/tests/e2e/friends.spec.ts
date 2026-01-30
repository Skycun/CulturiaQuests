import { test, expect } from '@playwright/test'

// Test credentials - these should match existing test users in the database
const TEST_USER_1 = {
  email: 'test@culturia.com',
  password: 'TestPassword123!',
  username: 'testuser',
}

const TEST_USER_2 = {
  email: 'test2@culturia.com',
  password: 'TestPassword123!',
  username: 'testuser2',
}

test.describe('Friends Page - Unauthenticated', () => {
  test('should show login prompt when not authenticated', async ({ page }) => {
    await page.goto('/tests/friends')

    // Should show unauthenticated message
    await expect(page.locator('text=You must be logged in')).toBeVisible()
    await expect(page.locator('text=Go to Login')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/tests/friends')

    await page.click('text=Go to Login')
    await expect(page).toHaveURL('/tests/login')
  })
})

test.describe('Friends Page - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/tests/login')
    await page.fill('input[type="email"]', TEST_USER_1.email)
    await page.fill('input[type="password"]', TEST_USER_1.password)
    await page.click('button[type="submit"]')

    // Wait for login to complete
    await page.waitForURL(/\/(tests\/infoguild|home|guild|tests\/friends)/, { timeout: 10000 })
  })

  test('should display friends page after login', async ({ page }) => {
    await page.goto('/tests/friends')

    // Should show the friends page content
    await expect(page.locator('h1:has-text("Friends System Test")')).toBeVisible()

    // Should show current account info
    await expect(page.locator('text=Current Account')).toBeVisible()
  })

  test('should display current account information', async ({ page }) => {
    await page.goto('/tests/friends')

    // Check account info section
    const accountSection = page.locator('text=Current Account').locator('..')
    await expect(accountSection).toBeVisible()

    // Should show username
    await expect(page.locator('text=Username')).toBeVisible()

    // Should show email
    await expect(page.locator('text=Email')).toBeVisible()
  })

  test('should display settings section', async ({ page }) => {
    await page.goto('/tests/friends')

    // Check settings section
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible()
    await expect(page.locator('text=Accept Friend Requests')).toBeVisible()

    // Should have enable/disable button
    const toggleButton = page.locator('button:has-text("Enabled"), button:has-text("Disabled")')
    await expect(toggleButton).toBeVisible()
  })

  test('should toggle friend requests setting', async ({ page }) => {
    await page.goto('/tests/friends')

    const toggleButton = page.locator('button:has-text("Enabled"), button:has-text("Disabled")')
    const initialState = await toggleButton.textContent()

    await toggleButton.click()

    // Wait for state to change
    await page.waitForTimeout(1000)

    const newState = await toggleButton.textContent()

    // State should have changed
    if (initialState === 'Enabled') {
      expect(newState).toBe('Disabled')
    } else {
      expect(newState).toBe('Enabled')
    }

    // Toggle back to original state
    await toggleButton.click()
  })

  test('should display search section', async ({ page }) => {
    await page.goto('/tests/friends')

    // Check search section
    await expect(page.locator('h2:has-text("Search for a Friend")')).toBeVisible()
    await expect(page.locator('input[placeholder="Enter exact username"]')).toBeVisible()
    await expect(page.locator('button:has-text("Search")')).toBeVisible()
  })

  test('should search for non-existent user', async ({ page }) => {
    await page.goto('/tests/friends')

    // Search for a user that doesn't exist
    await page.fill('input[placeholder="Enter exact username"]', 'nonexistentuser12345')
    await page.click('button:has-text("Search")')

    // Wait for search result
    await page.waitForTimeout(2000)

    // Should show "not found" or similar message
    await expect(page.locator('text=User not found').or(page.locator('text=not found'))).toBeVisible()
  })

  test('should display friends lists sections', async ({ page }) => {
    await page.goto('/tests/friends')

    // Check that all sections are present
    await expect(page.locator('h2:has-text("Received Requests")')).toBeVisible()
    await expect(page.locator('h2:has-text("Sent Requests")')).toBeVisible()
    await expect(page.locator('h2:has-text("My Friends")')).toBeVisible()
  })

  test('should display debug section', async ({ page }) => {
    await page.goto('/tests/friends')

    // Check debug section exists
    const debugSection = page.locator('summary:has-text("Debug Info")')
    await expect(debugSection).toBeVisible()

    // Click to expand
    await debugSection.click()

    // Should show debug info
    await expect(page.locator('text=My Guild ID:')).toBeVisible()
    await expect(page.locator('text=Friend Requests Enabled:')).toBeVisible()
  })
})

test.describe('Friends - Search and Request Flow', () => {
  test('search button should be disabled with empty input', async ({ page }) => {
    // Login first
    await page.goto('/tests/login')
    await page.fill('input[type="email"]', TEST_USER_1.email)
    await page.fill('input[type="password"]', TEST_USER_1.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(tests\/infoguild|home|guild|tests\/friends)/, { timeout: 10000 })

    await page.goto('/tests/friends')

    // Search button should be disabled with empty input
    const searchButton = page.locator('button:has-text("Search")')
    await expect(searchButton).toBeDisabled()

    // Type something
    await page.fill('input[placeholder="Enter exact username"]', 'test')

    // Now button should be enabled
    await expect(searchButton).toBeEnabled()

    // Clear input
    await page.fill('input[placeholder="Enter exact username"]', '')

    // Button should be disabled again
    await expect(searchButton).toBeDisabled()
  })
})

test.describe('Friends - Error Handling', () => {
  test('should display error messages gracefully', async ({ page }) => {
    // Login first
    await page.goto('/tests/login')
    await page.fill('input[type="email"]', TEST_USER_1.email)
    await page.fill('input[type="password"]', TEST_USER_1.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(tests\/infoguild|home|guild|tests\/friends)/, { timeout: 10000 })

    await page.goto('/tests/friends')

    // Page should load without critical errors
    await expect(page.locator('h1:has-text("Friends System Test")')).toBeVisible()

    // No error alerts should be visible initially (unless there's an actual error)
    const errorSection = page.locator('.bg-red-50')
    const errorCount = await errorSection.count()

    // If there's an error, it should have text
    if (errorCount > 0) {
      await expect(errorSection.first()).toContainText(/.+/)
    }
  })
})
