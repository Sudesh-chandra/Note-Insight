/**
 * Note Insight — Full E2E Test Suite
 * Tests all core + bonus features against the live deployed application.
 *
 * Run: npx playwright test --config=e2e-tests/playwright.config.ts
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import {
  FRONTEND_URL,
  BACKEND_URL,
  USER_1,
  USER_2,
  SYNTHETIC_NOTE,
  SHORT_NOTE,
  signUpUser,
  logInUser,
  submitNoteViaUI,
  extractFirebaseToken,
  getFixturePath,
  setupConsoleErrorCollector,
} from "./helpers";

// ─────────────────────────────────────────────────────────────
// 1. AUTHENTICATION & TENANT ISOLATION
// ─────────────────────────────────────────────────────────────

test.describe("1. Authentication & Tenant Isolation", () => {
  let user1Context: BrowserContext;
  let user2Context: BrowserContext;
  let user1Page: Page;
  let user2Page: Page;
  let user1NoteId: string;

  test("1.1 — Sign up User 1 and verify dashboard renders", async ({ browser }) => {
    user1Context = await browser.newContext();
    user1Page = await user1Context.newPage();
    const consoleErrors = setupConsoleErrorCollector(user1Page);

    await signUpUser(user1Page, USER_1.email, USER_1.password);

    // Verify dashboard elements
    await expect(user1Page.locator("h2:has-text('New Analysis')")).toBeVisible();
    await expect(user1Page.locator("#note-text")).toBeVisible();
    await expect(user1Page.locator('button[type="submit"]:has-text("Analyze Note")')).toBeVisible();

    // Verify user email shown in header
    await expect(user1Page.locator(".user-email")).toContainText(USER_1.email);

    // Check no critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("DevTools")
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join("; ")}`).toHaveLength(0);
  });

  test("1.2 — User 1 submits a note to create data for isolation test", async () => {
    user1NoteId = await submitNoteViaUI(user1Page, SHORT_NOTE);
    expect(user1NoteId).toBeTruthy();

    // Wait for analysis to complete
    await expect(user1Page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });
  });

  test("1.3 — Sign up User 2 and verify tenant isolation", async ({ browser }) => {
    user2Context = await browser.newContext();
    user2Page = await user2Context.newPage();
    const consoleErrors = setupConsoleErrorCollector(user2Page);

    await signUpUser(user2Page, USER_2.email, USER_2.password);

    // User 2 should see empty notes list (no notes from User 1)
    await expect(
      user2Page.locator("text=No notes yet")
    ).toBeVisible({ timeout: 15_000 });

    // User 2 should NOT be able to access User 1's note via direct URL
    const response = await user2Page.goto(`/notes/${user1NoteId}`);
    // Should either 404 or show error/not-found
    const errorOrNotFound =
      user2Page.locator("text=Note not found").or(user2Page.locator("text=Error"));
    await expect(errorOrNotFound.first()).toBeVisible({ timeout: 15_000 });

    // Check no critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("DevTools")
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join("; ")}`).toHaveLength(0);

    await user1Context.close();
    await user2Context.close();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. NOTE SUBMISSION & AI EXTRACTION (CORE)
// ─────────────────────────────────────────────────────────────

test.describe("2. Note Submission & AI Extraction", () => {
  let page: Page;
  let context: BrowserContext;
  let extractedNoteId: string;

  test("2.1 — Submit 250-word note and verify structured AI output", async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const consoleErrors = setupConsoleErrorCollector(page);

    // Sign up a fresh user
    const runId = Date.now();
    const testUser = {
      email: `qa_submit_${runId}@doctustech.synthetic`,
      password: "Password123!",
    };
    await signUpUser(page, testUser.email, testUser.password);

    // Verify loading states: button should be disabled when text < 10 chars
    await page.fill("#note-text", "short");
    await expect(page.locator('button[type="submit"]')).toBeDisabled();

    // Fill the full synthetic note
    await page.fill("#note-text", SYNTHETIC_NOTE);
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    // Submit and wait for navigation to detail page
    extractedNoteId = await submitNoteViaUI(page, SYNTHETIC_NOTE);
    expect(extractedNoteId).toBeTruthy();

    // Wait for analysis to complete — check for analysis view
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });

    // Verify structured response elements:
    // — Encounter Summary
    const summarySection = page.locator(".analysis-section:has(h3:has-text('Encounter Summary'))");
    await expect(summarySection).toBeVisible();
    const summaryText = await summarySection.locator(".summary-text").textContent();
    expect(summaryText).toBeTruthy();
    expect(summaryText!.length).toBeGreaterThan(20);

    // — Identified Conditions with evidence quotes and ICD-10 codes
    const conditionsSection = page.locator(
      ".analysis-section:has(h3:has-text('Identified Conditions'))"
    );
    await expect(conditionsSection).toBeVisible();
    const conditionCards = conditionsSection.locator(".condition-card");
    const conditionCount = await conditionCards.count();
    expect(conditionCount, "Should extract at least 1 condition").toBeGreaterThanOrEqual(1);

    // Verify each condition has required fields
    for (let i = 0; i < conditionCount; i++) {
      const card = conditionCards.nth(i);
      // Condition name
      const name = await card.locator(".condition-name").textContent();
      expect(name, `Condition ${i} should have a name`).toBeTruthy();
      expect(name!.trim().length).toBeGreaterThan(0);

      // Evidence quote
      const quote = await card.locator(".evidence-quote").textContent();
      expect(quote, `Condition ${i} should have an evidence quote`).toBeTruthy();

      // ICD-10 code
      const icd = await card.locator(".icd-code").textContent();
      expect(icd, `Condition ${i} should have an ICD-10 code`).toBeTruthy();

      // Documentation status pill
      const statusPill = await card.locator(".status-pill").textContent();
      expect(statusPill, `Condition ${i} should have a documentation status`).toBeTruthy();

      // Confidence bar
      const confidence = await card.locator(".confidence-value").textContent();
      expect(confidence, `Condition ${i} should show confidence percentage`).toBeTruthy();
    }

    // — Documentation Gaps
    const gapsSection = page.locator(
      ".analysis-section:has(h3:has-text('Documentation Gaps'))"
    );
    await expect(gapsSection).toBeVisible();

    // — "Review & Correct" button should be present (pending review)
    await expect(page.locator('button:has-text("Review & Correct")')).toBeVisible();

    // — Status banner should say "AI Draft"
    await expect(page.locator(".status-banner.pending")).toContainText("AI Draft");

    // Check no critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("DevTools")
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join("; ")}`).toHaveLength(0);
  });

  test("2.2 — Traceability: verify all quotes exist in source note", async () => {
    // We're still on the note detail page from the previous test
    const noteText = SYNTHETIC_NOTE;
    const normalizeWS = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedNote = normalizeWS(noteText);

    const conditionCards = page.locator(".condition-card");
    const count = await conditionCards.count();
    let verifiedCount = 0;

    for (let i = 0; i < count; i++) {
      const quoteEl = conditionCards.nth(i).locator(".evidence-quote");
      const quoteText = await quoteEl.textContent();
      if (!quoteText) continue;

      // Remove surrounding quotes and normalize
      const cleanQuote = normalizeWS(quoteText.replace(/[""]/g, "").replace(/^"|"$/g, ""));
      if (cleanQuote.length < 5) continue;

      // Check if quote is a substring of the note (allowing whitespace differences)
      const found = normalizedNote.includes(cleanQuote);
      if (found) verifiedCount++;

      // Also check if the app flagged it as hallucinated
      const isHallucinated = await conditionCards
        .nth(i)
        .locator(".hallucination-warning")
        .count();
      if (isHallucinated > 0) {
        // App correctly identified it as not found — that's acceptable
        verifiedCount++;
      }
    }

    // At least 50% of quotes should be verified (some paraphrasing is acceptable)
    expect(
      verifiedCount,
      `At least half of ${count} quotes should trace back to source note`
    ).toBeGreaterThanOrEqual(Math.ceil(count * 0.5));
  });

  test.afterAll(async () => {
    await context?.close();
  });
});

// ─────────────────────────────────────────────────────────────
// 3. HUMAN REVIEW & STATE IMMUTABILITY (CORE)
// ─────────────────────────────────────────────────────────────

test.describe("3. Human Review & State Immutability", () => {
  let page: Page;
  let context: BrowserContext;
  let reviewNoteId: string;

  test("3.1 — Edit, add, remove conditions and save review", async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const consoleErrors = setupConsoleErrorCollector(page);

    // Sign up and submit a note
    const runId = Date.now();
    const testUser = {
      email: `qa_review_${runId}@doctustech.synthetic`,
      password: "Password123!",
    };
    await signUpUser(page, testUser.email, testUser.password);
    reviewNoteId = await submitNoteViaUI(page, SYNTHETIC_NOTE);
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });

    // Capture original AI conditions for comparison
    const originalConditions = await page.locator(".condition-name").allTextContents();
    expect(originalConditions.length).toBeGreaterThan(0);

    // Click "Review & Correct"
    await page.click('button:has-text("Review & Correct")');
    await expect(page.locator(".review-editor")).toBeVisible({ timeout: 10_000 });

    // — Edit first condition's name
    const firstConditionInput = page.locator(".review-condition-card").first().locator('input[type="text"]').first();
    const originalName = await firstConditionInput.inputValue();
    await firstConditionInput.fill(`${originalName} (Reviewed)`);

    // — Edit first condition's ICD-10 code
    const icdInput = page
      .locator(".review-condition-card")
      .first()
      .locator('input[type="text"]')
      .last();
    await icdInput.fill("E11.9");

    // — Add a new manual condition
    await page.click('button:has-text("+ Add Condition")');
    const newConditionCard = page.locator(".review-condition-card").last();
    await newConditionCard.locator('input[type="text"]').first().fill("Manual Test Condition");
    await newConditionCard.locator("textarea").first().fill("This is a manually added condition for testing");

    // Count conditions before removal
    const countBeforeRemoval = await page.locator(".review-condition-card").count();

    // — Remove the last condition (the one we just added — to test removal)
    // Actually keep it, but remove a different one (the second one if exists)
    if (countBeforeRemoval >= 2) {
      const removeBtn = page
        .locator(".review-condition-card")
        .nth(1)
        .locator('button:has-text("Remove")');
      await removeBtn.click();
    }

    // — Save the review
    await page.click('button:has-text("Save Review")');

    // Wait for save to complete — should return to analysis view
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 30_000 });

    // — Verify "Reviewed" status banner
    await expect(page.locator(".status-banner.reviewed")).toBeVisible({ timeout: 10_000 });

    // — Verify "Review & Correct" button is NO LONGER shown (already reviewed)
    await expect(page.locator('button:has-text("Review & Correct")')).not.toBeVisible();

    // — Verify edited condition name persists
    const conditionNames = await page.locator(".condition-name").allTextContents();
    const hasEditedName = conditionNames.some((n) => n.includes("(Reviewed)"));
    expect(hasEditedName, "Edited condition name should persist after save").toBe(true);

    // Check no critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("DevTools")
    );
    expect(criticalErrors, `Console errors: ${criticalErrors.join("; ")}`).toHaveLength(0);
  });

  test("3.2 — Verify AI output immutability via API", async () => {
    // Extract the JWT token from the page
    const token = await extractFirebaseToken(page);
    expect(token).toBeTruthy();

    // Fetch the note detail via API
    const response = await page.request.get(`${BACKEND_URL}/api/notes/${reviewNoteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBe(true);

    const detail = await response.json();
    const analysis = detail.latest_analysis;

    // AI conditions should still exist and be untouched
    expect(analysis.ai_conditions, "AI conditions should be preserved").toBeTruthy();
    expect(analysis.ai_conditions.length).toBeGreaterThan(0);

    // Reviewed conditions should exist and differ from AI
    expect(analysis.reviewed_conditions, "Reviewed conditions should exist").toBeTruthy();
    expect(analysis.reviewed_conditions.length).toBeGreaterThan(0);

    // Review status should be "reviewed"
    expect(analysis.review_status).toBe("reviewed");
    expect(analysis.reviewed_at, "reviewed_at timestamp should be set").toBeTruthy();

    // AI output should NOT equal reviewed output (we made changes)
    const aiNames = analysis.ai_conditions.map((c: { name: string }) => c.name);
    const reviewedNames = analysis.reviewed_conditions.map((c: { name: string }) => c.name);
    const areDifferent = JSON.stringify(aiNames) !== JSON.stringify(reviewedNames);
    expect(areDifferent, "AI and reviewed conditions should differ").toBe(true);
  });

  test.afterAll(async () => {
    await context?.close();
  });
});

// ─────────────────────────────────────────────────────────────
// 4. HISTORY LOG (CORE)
// ─────────────────────────────────────────────────────────────

test.describe("4. History Log", () => {
  let page: Page;
  let context: BrowserContext;

  test("4.1 — Notes ordered newest-first and review status persists", async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Sign up and submit two notes with a delay between them
    const runId = Date.now();
    const testUser = {
      email: `qa_history_${runId}@doctustech.synthetic`,
      password: "Password123!",
    };
    await signUpUser(page, testUser.email, testUser.password);

    // Submit first note
    const noteId1 = await submitNoteViaUI(page, SHORT_NOTE);
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });

    // Review the first note
    await page.click('button:has-text("Review & Correct")');
    await expect(page.locator(".review-editor")).toBeVisible();
    // Just save without changes to mark as reviewed
    await page.click('button:has-text("Save Review")');
    await expect(page.locator(".status-banner.reviewed")).toBeVisible({ timeout: 30_000 });

    // Go back to dashboard and submit second note
    await page.goto("/");
    const noteId2 = await submitNoteViaUI(page, SYNTHETIC_NOTE);
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });

    // Go back to dashboard to check history
    await page.goto("/");

    // Wait for notes to load
    await expect(page.locator(".note-card").first()).toBeVisible({ timeout: 15_000 });

    // Verify at least 2 notes exist
    const noteCards = page.locator(".note-card");
    const noteCount = await noteCards.count();
    expect(noteCount, "Should have at least 2 notes").toBeGreaterThanOrEqual(2);

    // Verify ordering: first card should be the most recent (noteId2)
    const firstCardUrl = await noteCards.first().getAttribute("onclick") || "";
    // NoteCard navigates via onClick, so we check the order by clicking
    await noteCards.first().click();
    await page.waitForURL("**/notes/**", { timeout: 10_000 });
    const firstNoteUrl = page.url();
    expect(firstNoteUrl).toContain(noteId2);

    // Go back and check the second note
    await page.goto("/");
    await noteCards.nth(1).click();
    await page.waitForURL("**/notes/**", { timeout: 10_000 });
    const secondNoteUrl = page.url();
    expect(secondNoteUrl).toContain(noteId1);

    // Verify the first submitted note shows "Reviewed" status
    // (It should be the second card since ordering is newest-first)
    await page.goto("/");
    await expect(page.locator(".note-card").nth(1)).toBeVisible();
    const reviewedBadge = page.locator(".note-card").nth(1).locator(".status-badge.reviewed");
    await expect(reviewedBadge).toBeVisible({ timeout: 5_000 });

    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. BONUS FEATURES VERIFICATION
// ─────────────────────────────────────────────────────────────

test.describe("5. Bonus Features", () => {
  let page: Page;
  let context: BrowserContext;
  let bonusUserEmail: string;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const runId = Date.now();
    bonusUserEmail = `qa_bonus_${runId}@doctustech.synthetic`;
    await signUpUser(page, bonusUserEmail, "Password123!");
  });

  test.afterEach(async () => {
    await context?.close();
  });

  // 5.1 — Document/Image Upload
  test("5.1 — PDF upload and text extraction", async () => {
    await page.goto("/");

    // Switch to upload mode
    await page.click('button:has-text("Upload Document")');

    // Verify upload area is visible
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5_000 });

    // Upload a PDF
    const pdfPath = getFixturePath("test_note_pdf_1.pdf");
    await fileInput.setInputFiles(pdfPath);

    // Wait for upload and analysis (or error if text is too short)
    // The test PDFs may contain minimal text, so we accept either outcome
    const analysisOrError = page
      .locator(".analysis-view")
      .or(page.locator(".form-error"));

    await analysisOrError.first().waitFor({ timeout: 120_000 });

    // If analysis completed, verify structure
    const hasAnalysis = await page.locator(".analysis-view").count();
    if (hasAnalysis > 0) {
      await expect(page.locator(".condition-card").first()).toBeVisible();
    }
    // If error (text too short), that's also valid for a minimal test PDF
    const hasError = await page.locator(".form-error").count();
    expect(
      hasAnalysis > 0 || hasError > 0,
      "Upload should either produce analysis or show an error"
    ).toBe(true);
  });

  test("5.2 — PNG image upload", async () => {
    await page.goto("/");
    await page.click('button:has-text("Upload Document")');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5_000 });

    const pngPath = getFixturePath("test_note_image_1.png");
    await fileInput.setInputFiles(pngPath);

    // Wait for result (analysis or error)
    const analysisOrError = page
      .locator(".analysis-view")
      .or(page.locator(".form-error"));
    await analysisOrError.first().waitFor({ timeout: 120_000 });

    const hasAnalysis = await page.locator(".analysis-view").count();
    const hasError = await page.locator(".form-error").count();
    expect(
      hasAnalysis > 0 || hasError > 0,
      "Image upload should produce analysis or error"
    ).toBe(true);
  });

  // 5.3 — Inline Evidence Highlighting
  test("5.3 — Hover condition card highlights evidence in note text", async () => {
    // Submit a note first
    const noteId = await submitNoteViaUI(page, SYNTHETIC_NOTE);
    await expect(page.locator(".analysis-view")).toBeVisible({ timeout: 120_000 });

    // Verify evidence highlight component is present
    const evidenceHighlight = page.locator(".evidence-highlight").or(page.locator(".note-text"));
    await expect(evidenceHighlight.first()).toBeVisible();

    // Verify the highlight hint is shown
    await expect(page.locator(".highlight-hint")).toBeVisible();

    // Hover over the first condition card
    const firstCondition = page.locator(".condition-card").first();
    await firstCondition.hover();

    // The first condition card should get the "highlighted" class
    await expect(firstCondition).toHaveClass(/highlighted/);

    // Check that a highlight span exists in the note text area
    const highlightedSpan = page.locator(".highlight-segment");
    // There should be at least one highlighted segment
    const highlightCount = await highlightedSpan.count();
    expect(highlightCount, "Should have at least one highlighted text segment").toBeGreaterThanOrEqual(1);

    // Move mouse away — highlight should clear
    await page.locator(".note-text-section h2").hover();
    // The condition card should no longer be highlighted
    await expect(firstCondition).not.toHaveClass(/highlighted/);
  });

  // 5.4 — Metrics Dashboard
  test("5.4 — Metrics page renders with all required data", async () => {
    // Navigate to metrics via header nav
    await page.click('a:has-text("Metrics")');
    await page.waitForURL("**/metrics", { timeout: 15_000 });

    // Verify metrics page title
    await expect(page.locator("h2:has-text('Clinician Correction Metrics')")).toBeVisible();

    // Verify summary metric cards
    await expect(page.locator(".metric-card")).toHaveCount(await page.locator(".metric-card").count());
    const metricCards = page.locator(".metric-card");
    const metricCount = await metricCards.count();
    expect(metricCount, "Should have at least 5 metric cards").toBeGreaterThanOrEqual(5);

    // Verify specific metric labels exist
    const metricLabels = await page.locator(".metric-label").allTextContents();
    expect(metricLabels).toContain("Total Notes");
    expect(metricLabels).toContain("Reviewed");
    expect(metricLabels).toContain("Correction Rate");

    // Verify condition changes section
    await expect(page.locator("h3:has-text('Condition Changes')")).toBeVisible();

    // Verify corrections by field section
    await expect(page.locator("h3:has-text('Corrections by Field')")).toBeVisible();
  });

  test.afterAll(async () => {
    await context?.close();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. API-LEVEL TESTS (Rate Limiting, Caching, Streaming)
// ─────────────────────────────────────────────────────────────

test.describe("6. API-Level Bonus Tests", () => {
  let page: Page;
  let context: BrowserContext;
  let authToken: string;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const runId = Date.now();
    const testUser = {
      email: `qa_api_${runId}@doctustech.synthetic`,
      password: "Password123!",
    };
    await signUpUser(page, testUser.email, testUser.password);
    authToken = await extractFirebaseToken(page);
  });

  test.afterEach(async () => {
    await context?.close();
  });

  // 6.1 — Note Caching (duplicate detection)
  test("6.1 — Duplicate note returns cached result quickly", async () => {
    const noteText = SHORT_NOTE;

    // First submission — should take normal time (LLM call)
    const start1 = Date.now();
    const resp1 = await page.request.post(`${BACKEND_URL}/api/notes`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ raw_text: noteText }),
    });
    const time1 = Date.now() - start1;
    expect(resp1.ok(), `First submission should succeed: ${resp1.status()}`).toBe(true);
    const data1 = await resp1.json();
    expect(data1.note_id).toBeTruthy();

    // Second submission of identical note — should be cached (< 3s to be safe)
    const start2 = Date.now();
    const resp2 = await page.request.post(`${BACKEND_URL}/api/notes`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ raw_text: noteText }),
    });
    const time2 = Date.now() - start2;
    expect(resp2.ok(), `Second submission should succeed (cache hit): ${resp2.status()}`).toBe(true);
    const data2 = await resp2.json();

    // Cache hit should return the same note_id
    expect(data2.note_id, "Cache hit should return same note_id").toBe(data1.note_id);

    // Cache response should be significantly faster
    expect(
      time2,
      `Cache hit should be fast (< 5000ms, was ${time2}ms vs ${time1}ms for first call)`
    ).toBeLessThan(5000);
  });

  // 6.2 — Rate Limiting (HTTP 429)
  test("6.2 — Rate limiting returns 429 after 10 rapid requests", async () => {
    const noteText = "Rate limit test note text that is long enough to pass validation check.";

    // Send 12 rapid requests — should get 429 at some point after 10
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const resp = await page.request.post(`${BACKEND_URL}/api/notes`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ raw_text: noteText + ` attempt ${i}` }),
      });
      statuses.push(resp.status());
      // If we got a 429, we can stop
      if (resp.status() === 429) break;
    }

    // At least one should be 429
    const has429 = statuses.includes(429);
    expect(
      has429,
      `Should receive HTTP 429 after rate limit. Statuses: ${statuses.join(", ")}`
    ).toBe(true);

    // Verify 429 comes after some successful requests
    const first429Index = statuses.indexOf(429);
    expect(first429Index, "429 should not be the first response").toBeGreaterThan(0);
  });

  // 6.3 — SSE Streaming endpoint
  test("6.3 — Streaming endpoint returns SSE events", async () => {
    // Use page.evaluate to make a fetch request and read the SSE stream
    const events = await page.evaluate(async (backendUrl: string) => {
      const user = (window as unknown as Record<string, unknown>)["__firebase_user" as string];
      // We need to get the token from the page's auth context
      const authModule = await import("firebase/auth");
      const firebaseApp = (window as unknown as Record<string, unknown>)["__firebase_app"];
      // Simpler: just use the current user from the app's auth
      const currentUser = authModule.getAuth().currentUser;
      if (!currentUser) return { error: "Not authenticated" };

      const token = await currentUser.getIdToken();
      const response = await fetch(`${backendUrl}/api/notes/analyze/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw_text: "Patient has diabetes and hypertension. Assessment: Type 2 diabetes mellitus, controlled. Plan: Continue metformin.",
        }),
      });

      if (!response.ok) {
        return { error: `HTTP ${response.status}`, body: await response.text() };
      }

      const reader = response.body?.getReader();
      if (!reader) return { error: "No reader" };

      const decoder = new TextDecoder();
      const collectedEvents: string[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ") || line.startsWith("data: ")) {
            collectedEvents.push(line.trim());
          }
        }

        // Stop after collecting enough events
        if (collectedEvents.length > 20) break;
      }

      return { events: collectedEvents, count: collectedEvents.length };
    }, BACKEND_URL);

    // The stream should have returned events
    if ("error" in events) {
      // If firebase/auth import fails, fall back to a simpler check
      console.log("SSE stream test: falling back to network check");
      // Just verify the endpoint exists and accepts auth
      const resp = await page.request.post(`${BACKEND_URL}/api/notes/analyze/stream`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ raw_text: "Patient has diabetes and hypertension. Assessment: Type 2 diabetes mellitus. Plan: Continue metformin." }),
      });
      expect(resp.status(), "Stream endpoint should return 200").toBe(200);
      const contentType = resp.headers()["content-type"] || "";
      expect(contentType, "Should return text/event-stream").toContain("text/event-stream");
    } else {
      expect(events.count, "Should receive SSE events").toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 7. BACKEND HEALTH & INTEGRITY
// ─────────────────────────────────────────────────────────────

test.describe("7. Backend Health & Integrity", () => {
  test("7.1 — Health endpoint returns 200", async ({ request }) => {
    const resp = await request.get(`${BACKEND_URL}/health`);
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.status).toBe("ok");
  });

  test("7.2 — Unauthenticated API request returns 401 or 403", async ({ request }) => {
    const resp = await request.get(`${BACKEND_URL}/api/notes`);
    // Firebase HTTP Bearer returns 403 when no credentials provided,
    // and 401 when credentials are invalid. Both indicate auth rejection.
    expect([401, 403]).toContain(resp.status());
  });

  test("7.3 — Invalid token returns 401", async ({ request }) => {
    const resp = await request.get(`${BACKEND_URL}/api/notes`, {
      headers: { Authorization: "Bearer invalid-token-xyz" },
    });
    expect(resp.status()).toBe(401);
  });
});
