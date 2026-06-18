import { test, expect } from "@playwright/test";

test.describe("CareConnect Frontend E2E & Role-Security Tests", () => {
  const BASE_URL = "http://localhost:8080";

  test("Patient Flow: Login, Dashboard, AI Checker, Reminders, and Route Security Redirect", async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/CareConnect/i);

    // 2. Navigate to Login Page
    await page.click('text=Get Started');
    await expect(page).toHaveURL(/.*login/);

    // 3. Select Patient Role & Request OTP
    await page.click('button:has-text("patient")');
    await page.fill('input[placeholder="John Doe"]', "E2E Patient");
    await page.fill('input[placeholder="hello@careconnect.com"]', "e2e.patient@careconnect.com");
    await page.click('button:has-text("Initiate Verification")');

    // 4. Wait for OTP to be auto-filled
    await page.waitForSelector('input[placeholder="••••••"]');
    await page.waitForTimeout(500); // Allow state to update fully
    await page.click('button:has-text("Verify Identity")');

    // 5. Patient Dashboard - Check Title and Header
    await expect(page).toHaveURL(/.*patient-dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Patient Portal').first()).toBeVisible();
    await expect(page.locator('h1')).toContainText("Welcome back");
    await expect(page.locator('text=Welcome back, E2E Patient')).toBeVisible();

    // 6. Test AI Symptom Checker
    await page.fill('textarea', "My joint hurts and my back feels stiff since morning");
    await page.click('button:has-text("Analyze Symptoms")');
    
    // Wait for AI diagnosis card to appear
    await page.waitForSelector('text=Matched Diagnosis');
    await expect(page.locator('h3')).toContainText("Chronic Inflammatory Musculoskeletal Strain");
    await page.click('button:has-text("Save to EMR")');

    // 7. Test Medication Reminders
    await page.fill('input[placeholder="E.g., Metformin 500mg"]', "E2E Calcium 500mg");
    await page.fill('input[type="time"]', "09:00");
    await page.click('button:has-text("Add Medication Alarm")');
    await expect(page.locator('text=E2E Calcium 500mg').first()).toBeVisible();

    // 8. Test Security: Patient trying to access Clinician Dashboard directly via URL
    await page.goto(`${BASE_URL}/dashboard`);
    // Should immediately redirect back to patient portal because of RoleProtectedRoute
    await expect(page).toHaveURL(/.*patient-dashboard/);

    // 9. Test Security: Patient trying to access /patients management page directly via URL
    await page.goto(`${BASE_URL}/patients`);
    await expect(page).toHaveURL(/.*patient-dashboard/);
  });

  test("Doctor Flow: Login, Clinical Overview, and Sidebar Check", async ({ page }) => {
    // 1. Navigate to Login Page
    await page.goto(`${BASE_URL}/login`);

    // 2. Select Doctor Role & Fill Details
    await page.click('button:has-text("doctor")');
    await page.fill('input[placeholder="hello@careconnect.com"]', "dr.alexander@careconnect.com");
    await page.click('button:has-text("Initiate Verification")');

    // 3. Wait for OTP & Verify
    await page.waitForSelector('input[placeholder="••••••"]');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Verify Identity")');

    // 4. Clinician Dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText("Clinical Overview");
    await expect(page.locator('text=Alexander').first()).toBeVisible();

    // 5. Sidebar Check: Verify doctor sees "Patients" and "E-Prescriptions"
    await expect(page.locator('aside >> text=Patients')).toBeVisible();
    await expect(page.locator('aside >> text=E-Prescriptions')).toBeVisible();
    await expect(page.locator('aside >> text=Clinical Dept')).toBeVisible();
  });

  test("Admin Flow: Login, Management Dashboard, and Sidebar Check", async ({ page }) => {
    // 1. Navigate to Login Page
    await page.goto(`${BASE_URL}/login`);

    // 2. Select Admin Role & Fill Details
    await page.click('button:has-text("admin")');
    await page.fill('input[placeholder="hello@careconnect.com"]', "admin@careconnect.com");
    await page.click('button:has-text("Initiate Verification")');

    // 3. Wait for OTP & Verify
    await page.waitForSelector('input[placeholder="••••••"]');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Verify Identity")');

    // 4. Management Dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Medical Admin')).toBeVisible();

    // 5. Sidebar Check: Verify admin sees "Patients" and "Advanced Tools"
    await expect(page.locator('aside >> text=Patients')).toBeVisible();
    await expect(page.locator('aside >> text=Advanced Tools')).toBeVisible();
  });
});
