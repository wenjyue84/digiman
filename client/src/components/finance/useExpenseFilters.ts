import { useState, useMemo } from "react";
import type { Expense as ExpenseType } from "@shared/schema";
import { parseAmount } from "./expense-constants";

export interface ExpenseFilterState {
  selectedCategory: string;
  dateFilter: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  sortBy: "date" | "amount" | "";
  sortOrder: "asc" | "desc";
}

export function useExpenseFilters(expenses: ExpenseType[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Date range shortcuts
  const setDateRange = (range: string) => {
    const now = new Date();
    let from = "";
    let to = "";

    switch (range) {
      case "today":
        from = to = now.toISOString().split('T')[0];
        break;
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().split('T')[0];
        break;
      }
      case "this-week": {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        from = startOfWeek.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      }
      case "this-month":
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case "last-month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        from = lastMonth.toISOString().split('T')[0];
        to = lastMonthEnd.toISOString().split('T')[0];
        break;
      }
      case "last-7-days": {
        const last7Days = new Date(now);
        last7Days.setDate(now.getDate() - 7);
        from = last7Days.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      }
      case "last-30-days": {
        const last30Days = new Date(now);
        last30Days.setDate(now.getDate() - 30);
        from = last30Days.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      }
      default:
        from = to = "";
    }

    setDateFrom(from);
    setDateTo(to);
    setDateFilter(range);
  };

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setDateFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSortBy("");
  };

  const hasActiveFilters = Boolean(
    selectedCategory !== "all" || dateFrom || dateTo || amountMin || amountMax || sortBy
  );

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(expense => {
      // Category filter
      if (selectedCategory && selectedCategory !== "all" && expense.category !== selectedCategory) return false;

      // Date range filter
      if (dateFrom || dateTo) {
        if (!expense.date) return false;
        const expDate = new Date(expense.date);
        if (isNaN(expDate.getTime())) return false;

        const expDateStr = expDate.toISOString().split('T')[0];
        if (dateFrom && expDateStr < dateFrom) return false;
        if (dateTo && expDateStr > dateTo) return false;
      } else if (dateFilter === "month") {
        // Legacy month filter for backward compatibility
        if (!expense.date) return false;
        const expDate = new Date(expense.date);
        if (isNaN(expDate.getTime())) return false;
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      }

      // Amount range filter
      const amount = parseAmount(expense.amount);
      if (amountMin && amount < parseFloat(amountMin)) return false;
      if (amountMax && amount > parseFloat(amountMax)) return false;

      return true;
    });

    // Apply sorting
    if (sortBy) {
      result = [...result].sort((a, b) => {
        let comparison = 0;

        if (sortBy === "date") {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          comparison = dateA - dateB;
        } else if (sortBy === "amount") {
          const amountA = parseAmount(a.amount);
          const amountB = parseAmount(b.amount);
          comparison = amountA - amountB;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [expenses, selectedCategory, dateFrom, dateTo, dateFilter, amountMin, amountMax, sortBy, sortOrder, currentMonth, currentYear]);

  // Calculate totals and analytics
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, exp) => sum + parseAmount(exp.amount), 0),
    [expenses]
  );

  const monthlyExpenses = useMemo(
    () => expenses
      .filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        if (isNaN(expDate.getTime())) return false;
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + parseAmount(exp.amount), 0),
    [expenses, currentMonth, currentYear]
  );

  // Monthly breakdowns for the last 6 months
  const monthlyBreakdowns = useMemo(() => {
    const breakdowns = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthExpenses = expenses.filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        if (isNaN(expDate.getTime())) return false;
        return expDate.getMonth() === month && expDate.getFullYear() === year;
      });

      const total = monthExpenses.reduce((sum, exp) => sum + parseAmount(exp.amount), 0);
      const categoryTotals = monthExpenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + parseAmount(exp.amount);
        return acc;
      }, {} as Record<string, number>);

      breakdowns.push({
        month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
        total,
        categoryTotals,
        expenseCount: monthExpenses.length
      });
    }
    return breakdowns;
  }, [expenses]);

  // Category totals for current month
  const currentMonthCategories = useMemo(
    () => expenses
      .filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        if (isNaN(expDate.getTime())) return false;
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + parseAmount(exp.amount);
        return acc;
      }, {} as Record<string, number>),
    [expenses, currentMonth, currentYear]
  );

  return {
    // Filter state
    selectedCategory,
    setSelectedCategory,
    dateFilter,
    setDateFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Actions
    setDateRange,
    clearAllFilters,
    hasActiveFilters,

    // Computed
    filteredExpenses,
    totalExpenses,
    monthlyExpenses,
    monthlyBreakdowns,
    currentMonthCategories,
  };
}
