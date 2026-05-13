import { test, expect } from '@playwright/test'

const STORAGE_KEY_WELCOME = 'cc-welcome-seen'

test('first visit redirects to /welcome', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Cardio Cat/)
  await expect(page).toHaveURL(/\/welcome$/)
})

test('returning visit loads dashboard at /', async ({ page, context }) => {
  await context.addInitScript((key) => {
    window.localStorage.setItem(key, '1')
  }, STORAGE_KEY_WELCOME)
  await page.goto('/')
  await expect(page).toHaveTitle(/Cardio Cat/)
  await expect(page).not.toHaveURL(/\/welcome$/)
})
