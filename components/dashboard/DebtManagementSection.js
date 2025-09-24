import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  DollarSign,
  TrendingDown,
  Target,
  Calendar,
  BarChart3,
  Calculator,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  PiggyBank,
  Flame,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEBT_MANAGEMENT_ENGINE = {
  calculatePayoffStrategies: (debts, extraPayment = 0) => {
    if (!debts || debts.length === 0) return { snowball: [], avalanche: [] };

    // Debt Snowball (lowest balance first)
    const snowballDebts = [...debts].sort((a, b) => a.balance - b.balance);

    // Debt Avalanche (highest interest rate first)
    const avalancheDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);

    const calculatePayoffPlan = (sortedDebts) => {
      let plan = [];
      let totalFreedPayment = extraPayment;
      let currentDate = new Date();

      sortedDebts.forEach((debt, index) => {
        const monthlyPayment = debt.minimumPayment + totalFreedPayment;
        const monthsToPayoff = Math.ceil(
          Math.log(1 + (debt.balance * (debt.interestRate / 100 / 12)) / monthlyPayment) /
          Math.log(1 + (debt.interestRate / 100 / 12))
        );

        const totalInterest = (monthsToPayoff * monthlyPayment) - debt.balance;
        const payoffDate = new Date(currentDate);
        payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

        plan.push({
          ...debt,
          monthlyPayment,
          monthsToPayoff: isFinite(monthsToPayoff) ? monthsToPayoff : 0,
          totalInterest: totalInterest > 0 ? totalInterest : 0,
          payoffDate,
          order: index + 1
        });

        // After paying off this debt, add its payment to the next debt
        totalFreedPayment += debt.minimumPayment;
        currentDate = new Date(payoffDate);
      });

      return plan;
    };

    return {
      snowball: calculatePayoffPlan(snowballDebts),
      avalanche: calculatePayoffPlan(avalancheDebts)
    };
  },

  getDebtSummary: (debts) => {
    if (!debts || debts.length === 0) {
      return {
        totalBalance: 0,
        totalMinimumPayment: 0,
        weightedInterestRate: 0,
        highestInterestRate: 0,
        lowestInterestRate: 0,
        totalAccounts: 0
      };
    }

    const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const weightedInterestRate = debts.reduce((sum, debt) => sum + (debt.interestRate * debt.balance), 0) / totalBalance;
    const interestRates = debts.map(debt => debt.interestRate);

    return {
      totalBalance,
      totalMinimumPayment,
      weightedInterestRate: weightedInterestRate || 0,
      highestInterestRate: Math.max(...interestRates),
      lowestInterestRate: Math.min(...interestRates),
      totalAccounts: debts.length
    };
  },

  generateDebtTips: (debts) => {
    const tips = [];
    const summary = DEBT_MANAGEMENT_ENGINE.getDebtSummary(debts);

    if (summary.totalBalance > 0) {
      tips.push({
        icon: Zap,
        title: 'Choose Your Strategy',
        description: 'Debt Snowball for motivation (pay smallest first) or Debt Avalanche for savings (pay highest interest first)',
        priority: 'high'
      });
    }

    if (summary.weightedInterestRate > 15) {
      tips.push({
        icon: Flame,
        title: 'High Interest Alert',
        description: `Your average interest rate is ${summary.weightedInterestRate.toFixed(1)}%. Consider debt consolidation or balance transfers.`,
        priority: 'high'
      });
    }

    if (debts.some(debt => debt.interestRate > 20)) {
      tips.push({
        icon: AlertTriangle,
        title: 'Credit Card Emergency',
        description: 'You have high-interest credit cards. These should be your top priority for payoff.',
        priority: 'high'
      });
    }

    tips.push({
      icon: PiggyBank,
      title: 'Emergency Fund First',
      description: 'Build a $1,000 emergency fund before aggressive debt payoff to avoid more debt.',
      priority: 'medium'
    });

    tips.push({
      icon: Calculator,
      title: 'Extra Payments Work',
      description: 'Even an extra $50/month can save thousands in interest and years of payments.',
      priority: 'medium'
    });

    return tips;
  }
};

const DebtManagementSection = ({ transactions, accounts, bills }) => {
  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('debtManagementData');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: 'Credit Card #1',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.99,
        minimumPayment: 125,
        creditor: 'Chase Freedom'
      },
      {
        id: 2,
        name: 'Credit Card #2',
        type: 'Credit Card',
        balance: 3200,
        interestRate: 24.99,
        minimumPayment: 85,
        creditor: 'Capital One'
      },
      {
        id: 3,
        name: 'Personal Loan',
        type: 'Personal Loan',
        balance: 8500,
        interestRate: 12.5,
        minimumPayment: 250,
        creditor: 'SoFi'
      }
    ];
  });

  const [extraPayment, setExtraPayment] = useState(100);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('snowball');
  const [expandedDebt, setExpandedDebt] = useState(null);

  useEffect(() => {
    localStorage.setItem('debtManagementData', JSON.stringify(debts));
  }, [debts]);

  const payoffPlans = DEBT_MANAGEMENT_ENGINE.calculatePayoffStrategies(debts, extraPayment);
  const debtSummary = DEBT_MANAGEMENT_ENGINE.getDebtSummary(debts);
  const debtTips = DEBT_MANAGEMENT_ENGINE.generateDebtTips(debts);

  const addDebt = (newDebt) => {
    setDebts(prev => [...prev, { ...newDebt, id: Date.now() }]);
    setShowAddDebt(false);
  };

  const updateDebt = (id, updates) => {
    setDebts(prev => prev.map(debt => debt.id === id ? { ...debt, ...updates } : debt));
  };

  const deleteDebt = (id) => {
    setDebts(prev => prev.filter(debt => debt.id !== id));
  };

  const DebtCard = ({ debt, payoffInfo, showPayoffInfo = false }) => {
    const isExpanded = expandedDebt === debt.id;

    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium">{debt.name}</h4>
              <p className="text-sm text-gray-600">{debt.creditor}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedDebt(isExpanded ? null : debt.id)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-600">Balance</p>
            <p className="font-semibold">${debt.balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Interest Rate</p>
            <p className="font-semibold">{debt.interestRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Min Payment</p>
            <p className="font-semibold">${debt.minimumPayment}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Type</p>
            <Badge variant="outline" className="text-xs">{debt.type}</Badge>
          </div>
        </div>

        {showPayoffInfo && payoffInfo && (
          <div className="bg-blue-50 p-3 rounded-lg mb-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Payoff Order</p>
                <p className="font-semibold">#{payoffInfo.order}</p>
              </div>
              <div>
                <p className="text-gray-600">Monthly Payment</p>
                <p className="font-semibold">${payoffInfo.monthlyPayment?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Payoff Date</p>
                <p className="font-semibold">{payoffInfo.payoffDate?.toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-600">Total Interest: ${payoffInfo.totalInterest?.toFixed(2)}</p>
              <Progress
                value={Math.max(0, 100 - (payoffInfo.monthsToPayoff || 0) * 2)}
                className="h-2 mt-1"
              />
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="border-t pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Balance</label>
                <input
                  type="number"
                  value={debt.balance}
                  onChange={(e) => updateDebt(debt.id, { balance: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={debt.interestRate}
                  onChange={(e) => updateDebt(debt.id, { interestRate: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Minimum Payment</label>
                <input
                  type="number"
                  value={debt.minimumPayment}
                  onChange={(e) => updateDebt(debt.id, { minimumPayment: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteDebt(debt.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const PayoffPlanView = ({ plan, strategyName }) => {
    const totalInterest = plan.reduce((sum, debt) => sum + (debt.totalInterest || 0), 0);
    const totalTime = Math.max(...plan.map(debt => debt.monthsToPayoff || 0));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <h4 className="font-medium text-gray-600">Total Interest</h4>
            <p className="text-2xl font-bold text-red-600">${totalInterest.toFixed(2)}</p>
          </Card>
          <Card className="p-4 text-center">
            <h4 className="font-medium text-gray-600">Time to Freedom</h4>
            <p className="text-2xl font-bold text-blue-600">{totalTime} months</p>
          </Card>
          <Card className="p-4 text-center">
            <h4 className="font-medium text-gray-600">Total Payments</h4>
            <p className="text-2xl font-bold text-green-600">${(debtSummary.totalBalance + totalInterest).toFixed(2)}</p>
          </Card>
        </div>

        <div className="space-y-3">
          {plan.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              payoffInfo={debt}
              showPayoffInfo={true}
            />
          ))}
        </div>
      </div>
    );
  };

  const AddDebtForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add New Debt</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          addDebt({
            name: formData.get('name'),
            type: formData.get('type'),
            creditor: formData.get('creditor'),
            balance: parseFloat(formData.get('balance')),
            interestRate: parseFloat(formData.get('interestRate')),
            minimumPayment: parseFloat(formData.get('minimumPayment'))
          });
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600">Debt Name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="e.g., Credit Card #3"
                className="w-full mt-1 p-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Type</label>
                <select name="type" required className="w-full mt-1 p-2 border rounded-lg">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Student Loan">Student Loan</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Creditor</label>
                <input
                  name="creditor"
                  type="text"
                  required
                  placeholder="Bank/Lender"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Balance ($)</label>
                <input
                  name="balance"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Interest Rate (%)</label>
                <input
                  name="interestRate"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Min Payment ($)</label>
                <input
                  name="minimumPayment"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowAddDebt(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Debt</Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Target className="w-5 h-5 mr-2 text-red-600" />
          Debt Management & Payoff
        </h2>
        <Badge className="bg-red-500 text-white px-3 py-1">
          ${debtSummary.totalBalance.toLocaleString()} total debt
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Payoff Plans</TabsTrigger>
          <TabsTrigger value="manage">Manage Debts</TabsTrigger>
          <TabsTrigger value="tips">Tips & Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <h4 className="font-medium text-gray-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Total Debt
              </h4>
              <p className="text-2xl font-bold text-red-600">${debtSummary.totalBalance.toLocaleString()}</p>
            </Card>
            <Card className="p-4 text-center">
              <h4 className="font-medium text-gray-600 flex items-center justify-center">
                <Calendar className="w-4 h-4 mr-1" />
                Min Payments
              </h4>
              <p className="text-2xl font-bold text-blue-600">${debtSummary.totalMinimumPayment.toLocaleString()}</p>
            </Card>
            <Card className="p-4 text-center">
              <h4 className="font-medium text-gray-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 mr-1" />
                Avg Interest
              </h4>
              <p className="text-2xl font-bold text-orange-600">{debtSummary.weightedInterestRate.toFixed(1)}%</p>
            </Card>
            <Card className="p-4 text-center">
              <h4 className="font-medium text-gray-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4 mr-1" />
                Accounts
              </h4>
              <p className="text-2xl font-bold text-purple-600">{debtSummary.totalAccounts}</p>
            </Card>
          </div>

          {/* Extra Payment Calculator */}
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Extra Payment Impact
            </h3>
            <div className="flex items-center space-x-4 mb-4">
              <label className="text-sm font-medium">Extra monthly payment:</label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                className="p-2 border rounded-lg w-32"
                min="0"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">Debt Snowball</h4>
                <p className="text-sm text-green-600">
                  Total Interest: ${payoffPlans.snowball.reduce((sum, debt) => sum + (debt.totalInterest || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm text-green-600">
                  Time to Freedom: {Math.max(...payoffPlans.snowball.map(debt => debt.monthsToPayoff || 0))} months
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Debt Avalanche</h4>
                <p className="text-sm text-blue-600">
                  Total Interest: ${payoffPlans.avalanche.reduce((sum, debt) => sum + (debt.totalInterest || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm text-blue-600">
                  Time to Freedom: {Math.max(...payoffPlans.avalanche.map(debt => debt.monthsToPayoff || 0))} months
                </p>
              </div>
            </div>
          </Card>

          {/* Current Debts */}
          <div>
            <h3 className="font-medium mb-4">Your Current Debts</h3>
            {debts.map(debt => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant={selectedStrategy === 'snowball' ? 'default' : 'outline'}
              onClick={() => setSelectedStrategy('snowball')}
              className="flex items-center"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Debt Snowball
            </Button>
            <Button
              variant={selectedStrategy === 'avalanche' ? 'default' : 'outline'}
              onClick={() => setSelectedStrategy('avalanche')}
              className="flex items-center"
            >
              <Flame className="w-4 h-4 mr-2" />
              Debt Avalanche
            </Button>
          </div>

          {selectedStrategy === 'snowball' && (
            <div>
              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Debt Snowball Strategy</h3>
                <p className="text-sm text-green-600">
                  Pay minimums on all debts, then put extra money toward the smallest balance first.
                  This builds momentum and motivation as you see debts disappear quickly.
                </p>
              </div>
              <PayoffPlanView plan={payoffPlans.snowball} strategyName="snowball" />
            </div>
          )}

          {selectedStrategy === 'avalanche' && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Debt Avalanche Strategy</h3>
                <p className="text-sm text-blue-600">
                  Pay minimums on all debts, then put extra money toward the highest interest rate first.
                  This saves the most money in interest over time.
                </p>
              </div>
              <PayoffPlanView plan={payoffPlans.avalanche} strategyName="avalanche" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Manage Your Debts</h3>
            <Button onClick={() => setShowAddDebt(true)} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Debt
            </Button>
          </div>

          <div className="space-y-3">
            {debts.map(debt => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>

          {debts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-medium">No debts added yet</h3>
              <p className="text-sm">Add your debts to create a personalized payoff plan.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tips" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debtTips.map((tip, index) => {
              const Icon = tip.icon;
              const priorityColors = {
                high: 'border-red-200 bg-red-50',
                medium: 'border-yellow-200 bg-yellow-50',
                low: 'border-green-200 bg-green-50'
              };

              return (
                <Card key={index} className={`p-4 ${priorityColors[tip.priority]}`}>
                  <div className="flex items-start space-x-3">
                    <Icon className="w-5 h-5 mt-1 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{tip.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{tip.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-4">
            <h3 className="font-medium mb-4">Debt Payoff Calculator</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Try different extra payment amounts to see how they impact your debt freedom date:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[50, 100, 200].map(amount => {
                  const testPlans = DEBT_MANAGEMENT_ENGINE.calculatePayoffStrategies(debts, amount);
                  const snowballTime = Math.max(...testPlans.snowball.map(debt => debt.monthsToPayoff || 0));
                  const avalancheTime = Math.max(...testPlans.avalanche.map(debt => debt.monthsToPayoff || 0));

                  return (
                    <div key={amount} className="p-3 border rounded-lg text-center">
                      <h4 className="font-medium">+${amount}/month</h4>
                      <p className="text-sm text-gray-600">Snowball: {snowballTime} months</p>
                      <p className="text-sm text-gray-600">Avalanche: {avalancheTime} months</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {showAddDebt && <AddDebtForm />}
    </Card>
  );
};

export default DebtManagementSection;