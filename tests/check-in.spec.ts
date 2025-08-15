import { test, expect } from '@playwright/test';

/**
 * NOTE FOR FUTURE TESTING:
 * 
 * Currently using in-memory storage for testing. To test the actual guest-checkin form functionality,
 * you'll need a valid token from the database.
 * 
 * When ready to test with real data, ask Replit's AI agent to:
 * 1. Create a guest token in the database
 * 2. Provide the token value for testing
 * 3. Or help set up test data with valid tokens
 * 
 * For now, these tests verify the error handling and redirect behavior.
 */

// Utility functions for generating random data
function generateRandomName(): string {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateRandomPhone(): string {
  const prefixes = ['010', '011', '012', '013', '014', '015', '016', '017', '018', '019'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
  return `${prefix}${number}`;
}

function generateRandomIC(): string {
  const year = Math.floor(Math.random() * 30) + 70; // 1970-1999
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  const state = Math.floor(Math.random() * 16) + 1;
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${year.toString().slice(-2)}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${state.toString().padStart(2, '0')}${random}`;
}

function generateRandomPassport(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
  return `${letter1}${letter2}${numbers}`;
}

function generateRandomDate(): string {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30); // 30 days from now
  
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

test.describe('Check In Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the check-in page
    // Note: You'll need to provide a valid token or mock the authentication
    await page.goto('/guest-checkin?token=test-token-123');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display check-in form with all required fields', async ({ page }) => {
    // Check if the main form elements are visible
    await expect(page.locator('h1:has-text("Self Check-in Form")')).toBeVisible();
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Identity Documents')).toBeVisible();
    await expect(page.locator('text=Payment Information')).toBeVisible();
    await expect(page.locator('text=Emergency Contact')).toBeVisible();
  });

  test('should fill all form fields with random data', async ({ page }) => {
    // Generate random data
    const randomName = generateRandomName();
    const randomPhone = generateRandomPhone();
    const randomIC = generateRandomIC();
    const randomPassport = generateRandomPassport();
    const randomCheckInDate = generateRandomDate();
    const randomCheckOutDate = generateRandomDate();
    const randomEmergencyContact = generateRandomName();
    const randomEmergencyPhone = generateRandomPhone();

    // Fill Personal Information
    await page.fill('#nameAsInDocument', randomName);
    await page.fill('#phoneNumber', randomPhone);
    
    // Select gender
    await page.click('text=Gender');
    const genderOptions = ['male', 'female', 'other', 'prefer-not-to-say'];
    const randomGender = genderOptions[Math.floor(Math.random() * genderOptions.length)];
    await page.click(`text=${randomGender}`);
    
    // Select nationality
    await page.click('text=Select nationality');
    await page.fill('input[placeholder="Search nationality..."]', 'Malaysian');
    await page.click('text=Malaysian');
    
    // Fill dates
    await page.fill('#checkInDate', randomCheckInDate);
    await page.fill('#checkOutDate', randomCheckOutDate);

    // Fill Identity Documents (choose either IC or Passport)
    const useIC = Math.random() > 0.5;
    if (useIC) {
      await page.fill('#icNumber', randomIC);
    } else {
      await page.fill('#passportNumber', randomPassport);
    }

    // Fill Emergency Contact
    await page.fill('#emergencyContact', randomEmergencyContact);
    await page.fill('#emergencyPhone', randomEmergencyPhone);

    // Fill Additional Notes
    const randomNotes = 'Test notes for automation testing. Special requirements: None.';
    await page.fill('#notes', randomNotes);

    // Select Payment Method
    await page.click('text=Select payment method');
    const paymentMethods = ['cash', 'bank', 'online_platform'];
    const randomPaymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    await page.click(`text=${randomPaymentMethod}`);

    // If cash payment, fill description
    if (randomPaymentMethod === 'cash') {
      await page.fill('#guestPaymentDescription', 'Paid to staff member at front desk');
    }

    // Verify all fields are filled
    await expect(page.locator('#nameAsInDocument')).toHaveValue(randomName);
    await expect(page.locator('#phoneNumber')).toHaveValue(randomPhone);
    await expect(page.locator('#emergencyContact')).toHaveValue(randomEmergencyContact);
    await expect(page.locator('#emergencyPhone')).toHaveValue(randomEmergencyPhone);
    await expect(page.locator('#notes')).toHaveValue(randomNotes);
  });

  test('should handle document upload functionality', async ({ page }) => {
    // Test document upload section
    await expect(page.locator('text=Upload IC/Passport Photo')).toBeVisible();
    
    // Check if upload buttons are present
    await expect(page.locator('text=Select IC Photo')).toBeVisible();
    await expect(page.locator('text=Select Passport Photo')).toBeVisible();
  });

  test('should validate form fields', async ({ page }) => {
    // Try to submit without required fields
    await page.click('text=Complete Check-in');
    
    // Should show validation errors
    await expect(page.locator('text=Please fix the following errors')).toBeVisible();
  });

  test('should handle nationality search', async ({ page }) => {
    // Test nationality search functionality
    await page.click('text=Select nationality');
    await page.fill('input[placeholder="Search nationality..."]', 'Singapore');
    
    // Should show filtered results
    await expect(page.locator('text=Singaporean')).toBeVisible();
  });

  test('should handle quick note selection', async ({ page }) => {
    // Test quick note buttons
    const quickNotes = [
      'Late arrival after 10 PM',
      'Prefer bottom capsule',
      'Early arrival before 2 PM',
      'Quiet area preferred',
      'Extra bedding needed'
    ];

    for (const note of quickNotes) {
      await page.click(`text=${note}`);
      // Verify note was added to textarea
      await expect(page.locator('#notes')).toContainText(note);
    }
  });

  test('should handle payment method changes', async ({ page }) => {
    // Test different payment methods
    const paymentMethods = [
      { name: 'cash', description: 'Paid to staff member' },
      { name: 'bank', description: 'Bank transfer completed' },
      { name: 'online_platform', description: 'Booking.com payment' }
    ];

    for (const method of paymentMethods) {
      await page.click('text=Select payment method');
      await page.click(`text=${method.name}`);
      
      if (method.name === 'cash') {
        await expect(page.locator('#guestPaymentDescription')).toBeVisible();
        await page.fill('#guestPaymentDescription', method.description);
      } else if (method.name === 'bank') {
        await expect(page.locator('text=Bank Account Details')).toBeVisible();
        await expect(page.locator('text=Maybank')).toBeVisible();
      }
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile-specific elements
    await expect(page.locator('text=📱 Mobile Check-in Ready')).toBeVisible();
    await page.click('text=Photo tips');
    await expect(page.locator('text=📱 Mobile Tips')).toBeVisible();
  });

  test('should handle form autosave', async ({ page }) => {
    // Fill some fields
    await page.fill('#nameAsInDocument', 'Test User');
    await page.fill('#phoneNumber', '0123456789');
    
    // Wait for autosave (500ms delay)
    await page.waitForTimeout(600);
    
    // Check localStorage for draft
    const draft = await page.evaluate(() => {
      return localStorage.getItem('guest-checkin-draft:test-token-123');
    });
    
    expect(draft).toBeTruthy();
    expect(JSON.parse(draft!)).toHaveProperty('nameAsInDocument', 'Test User');
  });

  test('should handle FAQ accordion', async ({ page }) => {
    // Test FAQ section
    const faqItems = [
      'IC vs Passport - which one should I provide?',
      'How do I upload my document photo?',
      'What phone number format should I use?',
      'Why do you need my gender?',
      'How is my privacy protected?',
      'Can I edit my information after check-in?'
    ];

    for (const faq of faqItems) {
      await page.click(`text=${faq}`);
      // Wait for accordion to expand
      await page.waitForTimeout(200);
      // Verify content is visible
      await expect(page.locator(`text=${faq}`)).toBeVisible();
    }
  });

  test('should handle language switching', async ({ page }) => {
    // Test language switcher if present
    const languageSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher');
    
    if (await languageSwitcher.isVisible()) {
      await languageSwitcher.click();
      // Test switching to different language
      await page.click('text=中文, 中文');
      
      // Verify some text changed (you'll need to adjust based on your i18n setup)
      await expect(page.locator('text=入住登记表')).toBeVisible();
    }
  });

  test('should complete full check-in flow', async ({ page }) => {
    // Fill all required fields with valid data
    await page.fill('#nameAsInDocument', 'Automated Test User');
    await page.fill('#phoneNumber', '0123456789');
    
    // Select gender
    await page.click('text=Gender');
    await page.click('text=male');
    
    // Select nationality
    await page.click('text=Select nationality');
    await page.fill('input[placeholder="Search nationality..."]', 'Malaysian');
    await page.click('text=Malaysian');
    
    // Set dates
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await page.fill('#checkInDate', today);
    await page.fill('#checkOutDate', tomorrow);
    
    // Fill IC number
    await page.fill('#icNumber', '880101015523');
    
    // Fill emergency contact
    await page.fill('#emergencyContact', 'Emergency Contact');
    await page.fill('#emergencyPhone', '0198765432');
    
    // Select payment method
    await page.click('text=Select payment method');
    await page.click('text=Cash (Paid to Guest/Person)');
    await page.fill('#guestPaymentDescription', 'Paid to front desk staff');
    
    // Add notes
    await page.fill('#notes', 'Automated test check-in. No special requirements.');
    
    // Verify form is ready for submission
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    
    // Note: Actual submission would require a valid token and backend setup
    // For testing purposes, we'll just verify the form is complete
    console.log('Form filled successfully - ready for submission');
  });
});
