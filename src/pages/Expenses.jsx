import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Wallet, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ExpenseModal from "../components/expenses/ExpenseModal";

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowModal(false);
      setSelectedExpense(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowModal(false);
      setSelectedExpense(null);
    },
  });

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterCategory === "All" || expense.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const categoryColors = {
    'Lab Fees': '#A78BFA',
    'Equipment': '#60A5FA',
    'Travel': '#34D399',
    'Marketing': '#F472B6',
    'Office Supplies': '#FBBF24',
    'Insurance': '#F87171',
    'Utilities': '#8B5CF6',
    'Salaries': '#10B981',
    'Other': '#94A3B8',
  };

  // Calculate category totals for pie chart
  const categoryData = Object.keys(categoryColors).map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + (e.amount || 0), 0),
    color: categoryColors[cat]
  })).filter(d => d.value > 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const thisMonthExpenses = expenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">
              Expense Management
            </h1>
            <p className="text-gray-500 mt-1">{expenses.length} total expenses</p>
          </div>
          <Button
            onClick={() => {
              setSelectedExpense(null);
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-red-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Stats & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center shadow-inner">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-800">${totalExpenses.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-inner">
              <TrendingDown className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-800">${thisMonthExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {categoryData.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['All', 'Lab Fees', 'Equipment', 'Travel', 'Marketing'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all ${
                  filterCategory === cat
                    ? 'clay-nav-active text-red-700'
                    : 'clay-button text-gray-600 hover:scale-105'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {filteredExpenses.map((expense) => (
          <div 
            key={expense.id} 
            onClick={() => {
              setSelectedExpense(expense);
              setShowModal(true);
            }}
            className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(145deg, ${categoryColors[expense.category]}80, ${categoryColors[expense.category]}50)` 
                  }}
                >
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg">{expense.description}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Badge 
                      className="rounded-xl px-3 py-1 text-xs font-medium border"
                      style={{ 
                        background: `${categoryColors[expense.category]}20`,
                        color: categoryColors[expense.category],
                        borderColor: `${categoryColors[expense.category]}40`
                      }}
                    >
                      {expense.category}
                    </Badge>
                    {expense.vendor && (
                      <span className="text-sm text-gray-500">{expense.vendor}</span>
                    )}
                    <span className="text-sm text-gray-400">
                      {new Date(expense.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-gray-800">${expense.amount?.toLocaleString()}</p>
                {expense.payment_method && (
                  <p className="text-xs text-gray-500 mt-1">{expense.payment_method}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <Wallet className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No expenses found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Expense Modal */}
      {showModal && (
        <ExpenseModal
          expense={selectedExpense}
          onClose={() => {
            setShowModal(false);
            setSelectedExpense(null);
          }}
          onSave={(data) => {
            if (selectedExpense) {
              updateMutation.mutate({ id: selectedExpense.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}