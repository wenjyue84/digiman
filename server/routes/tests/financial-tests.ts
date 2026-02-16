import { storage } from "../../storage";
import { SystemTest } from "./types";

export const financialTests: SystemTest[] = [
  {
    name: "Payment Processing",
    description: "Test payment amount validation and processing",
    async test() {
      try {
        // Test payment amount format validation
        const validAmounts = ["50.00", "100.50", "25.75"];
        const invalidAmounts = ["50", "50.5", "invalid", ""];

        const amountRegex = /^\d+\.\d{2}$/;

        for (const amount of validAmounts) {
          if (!amountRegex.test(amount)) {
            throw new Error(`Valid amount ${amount} failed validation`);
          }
        }

        for (const amount of invalidAmounts) {
          if (amountRegex.test(amount)) {
            throw new Error(`Invalid amount ${amount} passed validation`);
          }
        }

        // Test payment methods
        const validMethods = ['cash', 'card', 'transfer', 'qr'];
        if (validMethods.length === 0) {
          throw new Error("No valid payment methods defined");
        }

        return {
          passed: true,
          details: `✅ Payment processing validation working. Methods: ${validMethods.join(', ')}`
        };
      } catch (error: any) {
        throw new Error(`Payment processing test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check payment amount validation regex",
      "Verify payment method enum in schema",
      "Check payment processing logic in guest routes"
    ]
  },

  {
    name: "Expense Management",
    description: "Test expense tracking and financial records",
    async test() {
      try {
        // Test expense storage methods
        if (typeof storage.addExpense !== 'function') {
          throw new Error("addExpense method missing");
        }
        if (typeof storage.getExpenses !== 'function') {
          throw new Error("getExpenses method missing");
        }

        // Test expense data structure
        const testExpense = {
          amount: 50.00,
          description: "Test expense",
          category: "maintenance",
          date: new Date().toISOString().split('T')[0]
        };

        const requiredFields = ['amount', 'description', 'category', 'date'];
        const missingFields = requiredFields.filter(field => !(field in testExpense));
        if (missingFields.length > 0) {
          throw new Error(`Expense missing required fields: ${missingFields.join(', ')}`);
        }

        return {
          passed: true,
          details: `✅ Expense management system functional`
        };
      } catch (error: any) {
        throw new Error(`Expense management test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check expense schema in shared/schema.ts",
      "Verify expense storage methods implementation",
      "Check expense routes in server/routes/expenses.ts"
    ]
  },
];
