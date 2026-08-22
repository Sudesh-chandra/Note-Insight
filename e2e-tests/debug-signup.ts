/**
 * Quick diagnostic: test the signup flow and capture screenshots.
 */
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("1. Navigating to login page...");
  await page.goto("https://frontend-red-one-81.vercel.app/login", { timeout: 30_000 });
  await page.screenshot({ path: "e2e-tests/debug-01-login-page.png" });
  console.log("   URL:", page.url());

  // Check what's on the page
  const title = await page.title();
  console.log("   Title:", title);

  const bodyText = await page.locator("body").textContent();
  console.log("   Body contains 'Note Insight':", bodyText?.includes("Note Insight"));
  console.log("   Body contains 'Sign In':", bodyText?.includes("Sign In"));

  // Click "Sign up" to switch to signup form
  console.log("2. Clicking 'Sign up' link...");
  const signupLink = page.locator('button:has-text("Sign up")');
  const signupLinkCount = await signupLink.count();
  console.log("   Found 'Sign up' buttons:", signupLinkCount);

  if (signupLinkCount > 0) {
    await signupLink.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e-tests/debug-02-signup-form.png" });
    console.log("   URL after click:", page.url());

    // Check for signup form fields
    const emailField = page.locator("#signup-email");
    const passwordField = page.locator("#signup-password");
    const confirmField = page.locator("#signup-confirm");
    console.log("   Email field visible:", await emailField.isVisible());
    console.log("   Password field visible:", await passwordField.isVisible());
    console.log("   Confirm field visible:", await confirmField.isVisible());

    // Fill in the form
    const testEmail = `qa_debug_${Date.now()}@doctustech.synthetic`;
    console.log("3. Filling signup form with:", testEmail);
    await emailField.fill(testEmail);
    await passwordField.fill("Password123!");
    await confirmField.fill("Password123!");
    await page.screenshot({ path: "e2e-tests/debug-03-form-filled.png" });

    // Submit
    console.log("4. Submitting form...");
    const submitBtn = page.locator('button[type="submit"]:has-text("Create Account")');
    console.log("   Submit button count:", await submitBtn.count());
    console.log("   Submit button disabled:", await submitBtn.isDisabled());

    await submitBtn.click();
    console.log("   Waiting for navigation...");

    // Wait a bit and check what happens
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "e2e-tests/debug-04-after-submit.png" });
    console.log("   URL after submit:", page.url());

    // Check for errors
    const errorEl = page.locator(".form-error");
    const errorCount = await errorEl.count();
    if (errorCount > 0) {
      const errorText = await errorEl.textContent();
      console.log("   ERROR shown:", errorText);
    }

    // Check if we're on the dashboard
    const dashboardHeading = page.locator("h2:has-text('New Analysis')");
    const dashboardVisible = await dashboardHeading.isVisible().catch(() => false);
    console.log("   Dashboard visible:", dashboardVisible);

    // Check if still on login page
    const loginCard = page.locator(".login-card");
    const loginVisible = await loginCard.isVisible().catch(() => false);
    console.log("   Login card still visible:", loginVisible);

    // Wait longer
    console.log("5. Waiting 15 more seconds...");
    await page.waitForTimeout(15000);
    await page.screenshot({ path: "e2e-tests/debug-05-after-wait.png" });
    console.log("   URL after wait:", page.url());

    const errorEl2 = page.locator(".form-error");
    if (await errorEl2.isVisible().catch(() => false)) {
      console.log("   ERROR:", await errorEl2.textContent());
    }
  }

  await browser.close();
  console.log("Done.");
})();
