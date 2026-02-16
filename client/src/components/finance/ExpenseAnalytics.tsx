import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { expenseCategories, type ExpenseCategoryKey } from "./expense-constants";

interface MonthlyBreakdown {
  month: string;
  monthShort: string;
  total: number;
  categoryTotals: Record<string, number>;
  expenseCount: number;
}

interface ExpenseAnalyticsProps {
  monthlyBreakdowns: MonthlyBreakdown[];
  currentMonthCategories: Record<string, number>;
  monthlyExpenses: number;
}

export function ExpenseAnalytics({
  monthlyBreakdowns,
  currentMonthCategories,
  monthlyExpenses,
}: ExpenseAnalyticsProps) {
  return (
    <div className="space-y-4">
      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expense Trends</CardTitle>
          <p className="text-sm text-gray-600">Track your expenses over the last 6 months</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {monthlyBreakdowns.map((month, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-sm font-medium text-gray-600">{month.monthShort}</div>
                  <div className="text-xl font-bold text-gray-900">RM {month.total.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">{month.expenseCount} items</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Month Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Category Breakdown</CardTitle>
          <p className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} spending by category
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(currentMonthCategories).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No expenses recorded for this month yet
              </div>
            ) : (
              Object.entries(currentMonthCategories)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const categoryInfo = expenseCategories[category as ExpenseCategoryKey];
                  const percentage = monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0;
                  return (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={categoryInfo?.color}>
                          {categoryInfo?.label || category}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          {percentage.toFixed(1)}% of monthly total
                        </div>
                      </div>
                      <div className="font-semibold">RM {amount.toFixed(2)}</div>
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Monthly History */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly History Details</CardTitle>
          <p className="text-sm text-gray-600">Detailed breakdown for each month</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {monthlyBreakdowns.slice().reverse().map((month, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{month.month}</h3>
                  <div className="text-right">
                    <div className="font-bold text-lg">RM {month.total.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{month.expenseCount} expenses</div>
                  </div>
                </div>
                {Object.keys(month.categoryTotals).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(month.categoryTotals).map(([category, amount]) => {
                      const categoryInfo = expenseCategories[category as ExpenseCategoryKey];
                      return (
                        <div key={category} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                          <span className="text-gray-600">{categoryInfo?.label || category}</span>
                          <span className="font-medium">RM {amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No expenses recorded</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
