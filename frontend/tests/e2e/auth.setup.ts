import { test as setup, expect } from '@playwright/test'

const TEST_USER = {
  email: 'test@culturia.com',
  password: 'TestPassword123!',
}

const TEST_USER_2 = {
  email: 'test2@culturia.com',
  password: 'TestPassword123!',
}

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/tests/login')

  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // Wait for redirect or success
  await expect(page).toHaveURL(/\/(tests\/infoguild|home|guild)/)

  // Save storage state
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
})

export { TEST_USER, TEST_USER_2 }
