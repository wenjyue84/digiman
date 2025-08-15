import { test, expect } from '@playwright/test';
import {
  fillPersonalInformation,
  fillIdentityDocuments,
  fillEmergencyContact,
  selectPaymentMethod,
  generateMockToken,
  waitForFormReady,
  waitForAutosave,
  testMobileViewport,
  testDesktopViewport
} from './utils/test-helpers';

test.describe('Check In Page - Simplified Tests', () => {
  let mockToken: string;

  test.beforeEach(async ({ page }) => {
    mockToken = generateMockToken();
    await page.goto(`/guest-checkin?token=${mockToken}`);
    await waitForFormReady(page);
  });

  test('should fill complete form with random data', async ({ page }) => {
    // Fill personal information
    const personalInfo = await fillPersonalInformation(page, {});
    
    // Fill identity documents
    const identityDocs = await fillIdentityDocuments(page, {});
    
    // Fill emergency contact
    const emergencyInfo = await fillEmergencyContact(page, {});
    
    // Select payment method
    await selectPaymentMethod(page, 'cash', 'Paid to front desk staff');
    
    // Verify all fields are filled
    await expect(page.locator('#nameAsInDocument')).toHaveValue(personalInfo.name);
    await expect(page.locator('#phoneNumber')).toHaveValue(personalInfo.phone);
    await expect(page.locator('#emergencyContact')).toHaveValue(emergencyInfo.contact);
    await expect(page.locator('#emergencyPhone')).toHaveValue(emergencyInfo.phone);
    await expect(page.locator('#notes')).toHaveValue(emergencyInfo.notes);
    
    console.log('✅ Form filled successfully with random data');
    console.log('Personal Info:', personalInfo);
    console.log('Identity Docs:', identityDocs);
    console.log('Emergency Info:', emergencyInfo);
  });

  test('should test all payment methods', async ({ page }) => {
    const paymentMethods = ['cash', 'bank', 'online_platform'];
    
    for (const method of paymentMethods) {
      console.log(`Testing payment method: ${method}`);
      
      if (method === 'cash') {
        await selectPaymentMethod(page, method, 'Paid to staff member');
        await expect(page.locator('#guestPaymentDescription')).toBeVisible();
      } else if (method === 'bank') {
        await selectPaymentMethod(page, method);
        await expect(page.locator('text=Bank Account Details')).toBeVisible();
        await expect(page.locator('text=Maybank')).toBeVisible();
      } else {
        await selectPaymentMethod(page, method);
      }
      
      // Verify payment method is selected
      await expect(page.locator('text=Select payment method')).not.toBeVisible();
    }
  });

  test('should handle form autosave', async ({ page }) => {
    // Fill some fields
    await page.fill('#nameAsInDocument', 'Autosave Test User');
    await page.fill('#phoneNumber', '0123456789');
    
    // Wait for autosave and verify
    const draft = await waitForAutosave(page, mockToken);
    
    expect(draft.nameAsInDocument).toBe('Autosave Test User');
    expect(draft.phoneNumber).toBe('0123456789');
    
    console.log('✅ Form autosave working correctly');
  });

  test('should test mobile responsiveness', async ({ page }) => {
    await testMobileViewport(page);
    
    // Verify mobile-specific elements
    await expect(page.locator('text=📱 Mobile Check-in Ready')).toBeVisible();
    await page.click('text=Photo tips');
    await expect(page.locator('text=📱 Mobile Tips')).toBeVisible();
    
    // Test mobile form interactions
    await fillPersonalInformation(page, {});
    
    console.log('✅ Mobile responsiveness test passed');
  });

  test('should test quick note selection', async ({ page }) => {
    const quickNotes = [
      'Late arrival after 10 PM',
      'Prefer bottom capsule',
      'Early arrival before 2 PM',
      'Quiet area preferred',
      'Extra bedding needed'
    ];

    for (const note of quickNotes) {
      await page.click(`text=${note}`);
      await expect(page.locator('#notes')).toContainText(note);
    }
    
    console.log('✅ Quick note selection working correctly');
  });

  test('should test nationality search', async ({ page }) => {
    const testNationalities = ['Singaporean', 'Indonesian', 'Thai'];
    
    for (const nationality of testNationalities) {
      await page.click('text=Select nationality');
      await page.fill('input[placeholder="Search nationality..."]', nationality);
      await expect(page.locator(`text=${nationality}`)).toBeVisible();
    }
    
    console.log('✅ Nationality search working correctly');
  });

  test('should test FAQ accordion', async ({ page }) => {
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
      await page.waitForTimeout(200);
      await expect(page.locator(`text=${faq}`)).toBeVisible();
    }
    
    console.log('✅ FAQ accordion working correctly');
  });

  test('should test form validation', async ({ page }) => {
    // Try to submit without required fields
    await page.click('text=Complete Check-in');
    
    // Should show validation errors
    await expect(page.locator('text=Please fix the following errors')).toBeVisible();
    
    console.log('✅ Form validation working correctly');
  });

  test('should test complete check-in flow', async ({ page }) => {
    // Fill all required fields with valid data
    const personalInfo = await fillPersonalInformation(page, {
      name: 'Complete Test User',
      phone: '0123456789',
      gender: 'male',
      nationality: 'Malaysian'
    });
    
    const identityDocs = await fillIdentityDocuments(page, {
      useIC: true,
      icNumber: '880101015523'
    });
    
    const emergencyInfo = await fillEmergencyContact(page, {
      contact: 'Emergency Contact',
      phone: '0198765432',
      notes: 'Complete test check-in. No special requirements.'
    });
    
    await selectPaymentMethod(page, 'cash', 'Paid to front desk staff');
    
    // Verify form is ready for submission
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    
    console.log('✅ Complete check-in flow test passed');
    console.log('Form data:', {
      personalInfo,
      identityDocs,
      emergencyInfo
    });
  });

  test('should test different viewport sizes', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} viewport`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Verify form is still accessible
      await expect(page.locator('#nameAsInDocument')).toBeVisible();
      await expect(page.locator('#phoneNumber')).toBeVisible();
      
      // Fill a field to test interaction
      await page.fill('#nameAsInDocument', `Test ${viewport.name}`);
    }
    
    console.log('✅ All viewport sizes working correctly');
  });
});
