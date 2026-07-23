export interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  date: string;
}
