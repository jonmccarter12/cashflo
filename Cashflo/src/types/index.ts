export interface DashboardData {
  id: string;
  title: string;
  value: number;
  change: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
}