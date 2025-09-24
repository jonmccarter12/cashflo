import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';

const FINANCIAL_HEALTH_ENGINE = {
  calculateWellnessScore: (profile) => {
    const weights = {
      creditScore: 0.25,
      debtToIncome: 0.20,
      emergencyFund: 0.20,
      savingsRate: 0.15,
      budgetAdherence: 0.10,
      diversification: 0.10
    };

    let score = 0;

    // Credit Score (300-850 → 0-100)
    if (profile.creditScore) {
      score += ((profile.creditScore - 300) / 550) * 100 * weights.creditScore;
    }

    // Debt-to-Income Ratio (lower is better)
    const dtiRatio = profile.monthlyDebt / profile.monthlyIncome || 0;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 100 * 2.5)); // 40% DTI = 0 score
    score += dtiScore * weights.debtToIncome;

    // Emergency Fund (3-6 months expenses)
    const monthlyExpenses = profile.monthlyIncome * 0.7; // Estimate 70% of income
    const emergencyMonths = profile.emergencyFund / monthlyExpenses || 0;
    const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100);
    score += emergencyScore * weights.emergencyFund;

    // Savings Rate (% of income saved)
    const savingsRate = profile.monthlySavings / profile.monthlyIncome || 0;
    const savingsScore = Math.min(100, (savingsRate / 0.20) * 100); // 20% = perfect
    score += savingsScore * weights.savingsRate;

    // Budget Adherence
    const budgetScore = profile.budgetAdherence || 75;
    score += budgetScore * weights.budgetAdherence;

    // Investment Diversification
    const diversificationScore = profile.investmentDiversification || 60;
    score += diversificationScore * weights.diversification;

    return Math.round(Math.max(0, Math.min(100, score)));
  },

  getScoreCategory: (score) => {
    if (score >= 80) return { category: 'Excellent', color: 'bg-green-500', textColor: 'text-green-600' };
    if (score >= 70) return { category: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    if (score >= 60) return { category: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (score >= 40) return { category: 'Needs Work', color: 'bg-orange-500', textColor: 'text-orange-600' };
    return { category: 'Poor', color: 'bg-red-500', textColor: 'text-red-600' };
  },

  generateRecommendations: (profile, score) => {
    const recommendations = [];

    if (!profile.creditScore || profile.creditScore < 700) {
      recommendations.push({
        priority: 'high',
        category: 'Credit',
        icon: CreditCard,
        title: 'Improve Credit Score',
        description: 'Pay down credit card balances and ensure on-time payments',
        impact: '+15-25 points'
      });
    }

    const dtiRatio = profile.monthlyDebt / profile.monthlyIncome || 0;
    if (dtiRatio > 0.36) {
      recommendations.push({
        priority: 'high',
        category: 'Debt',
        icon: AlertTriangle,
        title: 'Reduce Debt-to-Income Ratio',
        description: 'Focus on paying down high-interest debt first',
        impact: 'Save $' + Math.round(profile.monthlyDebt * 0.1) + '/month'
      });
    }

    const monthlyExpenses = profile.monthlyIncome * 0.7;
    const emergencyMonths = profile.emergencyFund / monthlyExpenses || 0;
    if (emergencyMonths < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'Emergency Fund',
        icon: Shield,
        title: 'Build Emergency Fund',
        description: 'Aim for 3-6 months of expenses in savings',
        impact: 'Target: $' + Math.round(monthlyExpenses * 3).toLocaleString()
      });
    }

    const savingsRate = profile.monthlySavings / profile.monthlyIncome || 0;
    if (savingsRate < 0.15) {
      recommendations.push({
        priority: 'medium',
        category: 'Savings',
        icon: PiggyBank,
        title: 'Increase Savings Rate',
        description: 'Try to save at least 15-20% of your income',
        impact: 'Target: $' + Math.round(profile.monthlyIncome * 0.15).toLocaleString() + '/month'
      });
    }

    return recommendations.slice(0, 4); // Top 4 recommendations
  },

  analyzeSpendingTrends: (transactions) => {
    // Mock analysis - in real app would analyze actual transaction data
    return [
      { category: 'Groceries', trend: 'up', change: 8.5, amount: 450 },
      { category: 'Dining', trend: 'down', change: -12.3, amount: 280 },
      { category: 'Transportation', trend: 'up', change: 15.2, amount: 320 },
      { category: 'Entertainment', trend: 'stable', change: 2.1, amount: 180 }
    ];
  }
};

const FinancialHealthSection = () => {
  const [healthProfile, setHealthProfile] = useState(() => {
    const saved = localStorage.getItem('financialHealthProfile');
    return saved ? JSON.parse(saved) : {
      monthlyIncome: 5000,
      monthlyDebt: 1200,
      emergencyFund: 8000,
      monthlySavings: 750,
      creditScore: 720,
      budgetAdherence: 82,
      investmentDiversification: 65
    };
  });

  const [wellnessScore, setWellnessScore] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [spendingTrends, setSpendingTrends] = useState([]);

  useEffect(() => {
    localStorage.setItem('financialHealthProfile', JSON.stringify(healthProfile));

    const score = FINANCIAL_HEALTH_ENGINE.calculateWellnessScore(healthProfile);
    setWellnessScore(score);

    const recs = FINANCIAL_HEALTH_ENGINE.generateRecommendations(healthProfile, score);
    setRecommendations(recs);

    const trends = FINANCIAL_HEALTH_ENGINE.analyzeSpendingTrends([]);
    setSpendingTrends(trends);
  }, [healthProfile]);

  const scoreInfo = FINANCIAL_HEALTH_ENGINE.getScoreCategory(wellnessScore);

  const updateProfile = (field, value) => {
    setHealthProfile(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const HealthMetric = ({ title, value, target, unit = '$', progress }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className="text-sm text-gray-500">
          {unit}{typeof value === 'number' ? value.toLocaleString() : value}
          {target && ` / ${unit}${target.toLocaleString()}`}
        </span>
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );

  const RecommendationCard = ({ rec }) => {
    const Icon = rec.icon;
    const priorityColors = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-yellow-200 bg-yellow-50',
      low: 'border-green-200 bg-green-50'
    };

    return (
      <div className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}>
        <div className="flex items-start space-x-3">
          <Icon className="w-5 h-5 mt-1 text-gray-600" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{rec.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="text-xs">
                {rec.category}
              </Badge>
              <span className="text-xs font-medium text-green-600">
                {rec.impact}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TrendItem = ({ trend }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${
          trend.trend === 'up' ? 'bg-red-500' :
          trend.trend === 'down' ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
        <span className="font-medium">{trend.category}</span>
      </div>
      <div className="text-right">
        <div className="font-medium">${trend.amount}</div>
        <div className={`text-sm flex items-center ${
          trend.trend === 'up' ? 'text-red-600' :
          trend.trend === 'down' ? 'text-green-600' : 'text-gray-500'
        }`}>
          {trend.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> :
           trend.trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> :
           <Activity className="w-3 h-3 mr-1" />}
          {Math.abs(trend.change).toFixed(1)}%
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Financial Health Dashboard
        </h2>
        <Badge className={`${scoreInfo.color} text-white px-3 py-1`}>
          {wellnessScore}/100 - {scoreInfo.category}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Action Items</TabsTrigger>
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Wellness Score Circle */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={scoreInfo.color.replace('bg-', '#')}
                  strokeWidth="2"
                  strokeDasharray={`${wellnessScore}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{wellnessScore}</div>
                  <div className={`text-sm ${scoreInfo.textColor}`}>{scoreInfo.category}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-lg font-semibold">${healthProfile.monthlyIncome.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Income</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <PiggyBank className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-lg font-semibold">${healthProfile.monthlySavings.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Savings</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-lg font-semibold">{healthProfile.creditScore}</div>
              <div className="text-sm text-gray-600">Credit Score</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Shield className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-lg font-semibold">${healthProfile.emergencyFund.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Emergency Fund</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-medium mb-4">Income & Savings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Monthly Income</label>
                  <input
                    type="number"
                    value={healthProfile.monthlyIncome}
                    onChange={(e) => updateProfile('monthlyIncome', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Monthly Savings</label>
                  <input
                    type="number"
                    value={healthProfile.monthlySavings}
                    onChange={(e) => updateProfile('monthlySavings', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <HealthMetric
                  title="Savings Rate"
                  value={`${((healthProfile.monthlySavings / healthProfile.monthlyIncome) * 100).toFixed(1)}%`}
                  progress={(healthProfile.monthlySavings / healthProfile.monthlyIncome) * 100 * 5}
                  unit=""
                />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">Debt & Credit</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Monthly Debt Payments</label>
                  <input
                    type="number"
                    value={healthProfile.monthlyDebt}
                    onChange={(e) => updateProfile('monthlyDebt', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Credit Score</label>
                  <input
                    type="number"
                    value={healthProfile.creditScore}
                    onChange={(e) => updateProfile('creditScore', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                    min="300"
                    max="850"
                  />
                </div>
                <HealthMetric
                  title="Debt-to-Income Ratio"
                  value={`${((healthProfile.monthlyDebt / healthProfile.monthlyIncome) * 100).toFixed(1)}%`}
                  progress={Math.max(0, 100 - ((healthProfile.monthlyDebt / healthProfile.monthlyIncome) * 100 * 2.5))}
                  unit=""
                />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">Emergency & Investments</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Emergency Fund</label>
                  <input
                    type="number"
                    value={healthProfile.emergencyFund}
                    onChange={(e) => updateProfile('emergencyFund', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <HealthMetric
                  title="Emergency Fund Coverage"
                  value={`${((healthProfile.emergencyFund / (healthProfile.monthlyIncome * 0.7))).toFixed(1)} months`}
                  progress={(healthProfile.emergencyFund / (healthProfile.monthlyIncome * 0.7)) / 6 * 100}
                  unit=""
                />
                <HealthMetric
                  title="Investment Diversification"
                  value={`${healthProfile.investmentDiversification}%`}
                  progress={healthProfile.investmentDiversification}
                  unit=""
                />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">Budget Performance</h3>
              <div className="space-y-4">
                <HealthMetric
                  title="Budget Adherence"
                  value={`${healthProfile.budgetAdherence}%`}
                  progress={healthProfile.budgetAdherence}
                  unit=""
                />
                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full text-sm">
                    <Target className="w-4 h-4 mr-2" />
                    Set Monthly Budget Goals
                  </Button>
                  <Button variant="outline" className="w-full text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Review Spending Categories
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Personalized Action Items</h3>
            <p className="text-sm text-gray-600">
              Based on your financial profile, here are the top recommendations to improve your wellness score:
            </p>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={index} rec={rec} />
            ))}
          </div>

          {recommendations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-medium">Great job!</h3>
              <p className="text-sm">Your financial health looks good. Keep up the excellent work!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Spending Trends</h3>
            <p className="text-sm text-gray-600">
              Track how your spending patterns have changed over the past 3 months:
            </p>
          </div>

          <div className="space-y-3">
            {spendingTrends.map((trend, index) => (
              <TrendItem key={index} trend={trend} />
            ))}
          </div>

          <Card className="p-4 mt-6">
            <h4 className="font-medium mb-3">Trend Analysis</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                Dining expenses decreased by 12.3% - great job cutting back!
              </div>
              <div className="flex items-center text-yellow-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Transportation costs increased 15.2% - consider carpooling or public transit
              </div>
              <div className="flex items-center text-blue-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overall spending is within your budget range
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default FinancialHealthSection;