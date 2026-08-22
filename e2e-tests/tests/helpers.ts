/**
 * Shared helpers for E2E tests against the live Note Insight deployment.
 */
import { type Page, type BrowserContext, expect } from "@playwright/test";
import path from "path";

export const FRONTEND_URL = "https://frontend-red-one-81.vercel.app";
export const BACKEND_URL = "https://note-insight.onrender.com";

// Unique test users — timestamped to avoid collisions across runs
const RUN_ID = Date.now();
export const USER_1 = {
  email: `qa_clinician_1_${RUN_ID}@doctustech.synthetic`,
  password: "Password123!",
};
export const USER_2 = {
  email: `qa_clinician_2_${RUN_ID}@doctustech.synthetic`,
  password: "Password123!",
};

/** 250-word synthetic clinical note for testing */
export const SYNTHETIC_NOTE = `Patient: John Smith
Date: 2024-11-15

SUBJECTIVE:
Mr. John Smith is a 58-year-old male presenting today for follow-up of his type 2 diabetes mellitus and hypertension. He reports increased thirst and frequent urination over the past two weeks. He also complains of occasional chest tightness when climbing stairs, which resolves with rest. He denies any fever, chills, or recent weight loss. His current medications include metformin 1000mg twice daily and lisinopril 20mg daily.

OBJECTIVE:
Vital signs: BP 148/92 mmHg, HR 78 bpm, Temp 98.6°F, SpO2 97% on room air.
General: Well-developed, well-nourished male in no acute distress.
Cardiovascular: Regular rate and rhythm, no murmurs, no peripheral edema.
Respiratory: Clear to auscultation bilaterally, no wheezes or crackles.
Labs: HbA1c 8.2%, fasting glucose 162 mg/dL, creatinine 1.1 mg/dL, potassium 4.2 mEq/L. Lipid panel: total cholesterol 218 mg/dL, LDL 138 mg/dL, HDL 42 mg/dL, triglycerides 190 mg/dL.

ASSESSMENT:
1. Type 2 diabetes mellitus — suboptimally controlled with HbA1c above target of 7.0%.
2. Essential hypertension — elevated despite current ACE inhibitor therapy.
3. Hyperlipidemia — LDL above goal given diabetic status.
4. Possible stable angina — exertional chest tightness warrants cardiac evaluation.

PLAN:
- Increase metformin to 1000mg three times daily; consider adding glipizide if HbA1c remains above target at next visit.
- Increase lisinopril to 40mg daily; add amlodipine 5mg if BP remains above 140/90.
- Start atorvastatin 40mg nightly for LDL goal <100 mg/dL given diabetes risk.
- Order stress echocardiogram to evaluate exertional chest pain; cardiology referral if positive.
- Recheck HbA1c and lipid panel in 3 months.
- Counseled on diet modification, sodium restriction, and daily walking exercise.`;

/** Short note for quick tests */
export const SHORT_NOTE = `Patient: Jane Doe
Date: 2024-12-01

The patient presents with persistent headache and mild fever for three days. Physical examination reveals temperature of 100.4°F and mild neck stiffness. Neurological exam is otherwise normal. Assessment: viral meningitis suspected. Plan: lumbar puncture ordered, acyclovir started empirically.`;

/**
 * Sign up a new user through the frontend signup form.
 */
export async function signUpUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  // Click "Sign up" link to switch to signup form
  await page.click('button:has-text("Sign up")');
  // Fill signup form
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  await page.fill('#signup-confirm', password);
  // Submit
  await page.click('button[type="submit"]:has-text("Create Account")');
  // Wait for navigation to dashboard (URL should be /)
  await page.waitForURL("**/", { timeout: 30_000 });
  // Verify dashboard loaded
  await expect(page.locator("h2:has-text('New Analysis')")).toBeVisible({ timeout: 15_000 });
}

/**
 * Log in an existing user through the frontend login form.
 */
export async function logInUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  await page.waitForURL("**/", { timeout: 30_000 });
  await expect(page.locator("h2:has-text('New Analysis')")).toBeVisible({ timeout: 15_000 });
}

/**
 * Extract the Firebase JWT token from the current page's auth state.
 * Uses Firebase REST API to sign in and get a fresh token.
 */
export async function extractFirebaseToken(page: Page): Promise<string> {
  // Try to get token via page.evaluate using Firebase internals
  const token = await page.evaluate(async () => {
    const win = window as unknown as Record<string, unknown>;
    // Check for any global Firebase reference
    const firebaseApp = win["firebase"];
    if (firebaseApp && typeof firebaseApp === "object") {
      const auth = (firebaseApp as Record<string, unknown>)["auth"];
      if (auth && typeof (auth as Record<string, unknown>).currentUser === "object") {
        const currentUser = (auth as Record<string, unknown>).currentUser as Record<string, unknown>;
        if (currentUser && typeof currentUser.getIdToken === "function") {
          return await currentUser.getIdToken();
        }
      }
    }
    return null;
  });

  if (token) return token;

  // Fallback: use Firebase REST API to sign in with the current user's email
  // First, get the email from the page
  const email = await page.locator(".user-email").textContent();
  if (!email) throw new Error("Cannot extract token: user email not found on page");

  // Get the Firebase config from the page's environment
  const firebaseConfig = await page.evaluate(() => {
    // Vite bakes env vars into the bundle, but we can try to find them
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const src = script.getAttribute("src") || "";
      if (src.includes("index-") && src.endsWith(".js")) {
        // The config is embedded in the JS bundle
        break;
      }
    }
    return null;
  });

  // Alternative: intercept next API call after a page reload
  return await interceptTokenFromReload(page);
}

/**
 * Intercept network requests after a page reload to extract the Firebase JWT token.
 */
async function interceptTokenFromReload(page: Page): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Token extraction timed out after reload")), 30_000);
    let resolved = false;

    page.on("request", (request) => {
      if (resolved) return;
      const authHeader = request.headers()["authorization"];
      if (authHeader && authHeader.startsWith("Bearer ")) {
        resolved = true;
        clearTimeout(timeout);
        resolve(authHeader.slice(7));
      }
    });

    // Trigger API calls by reloading the page
    page.reload().catch(() => {});
  });
}

/**
 * Submit a clinical note through the UI and wait for navigation to the detail page.
 * Returns the note ID from the URL.
 */
export async function submitNoteViaUI(
  page: Page,
  noteText: string
): Promise<string> {
  // Make sure we're on the dashboard
  await page.goto("/");
  await expect(page.locator("#note-text")).toBeVisible({ timeout: 10_000 });

  // Fill in the note
  await page.fill("#note-text", noteText);

  // Click submit
  await page.click('button[type="submit"]:has-text("Analyze Note")');

  // Wait for navigation to the note detail page
  await page.waitForURL("**/notes/**", { timeout: 120_000 });

  // Extract note ID from URL
  const url = page.url();
  const noteId = url.split("/notes/")[1]?.split("?")[0] || "";
  return noteId;
}

/**
 * Get the test fixture file path.
 */
export function getFixturePath(filename: string): string {
  return path.resolve(__dirname, "..", "..", "test_fixtures", filename);
}

/**
 * Collect browser console errors.
 */
export function setupConsoleErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });
  return errors;
}
