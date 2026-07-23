export const PLANS = {
  FREE: {
    key: 'free',
    name: 'Free',
    price: 0,
    features: ['Basic lessons', 'Community access'],
  },
  PREMIUM: {
    key: 'premium',
    name: 'Premium',
    price: 29,
    features: ['Unlimited lessons', 'AI tutor', 'Certificates'],
  },
  PRO: {
    key: 'pro',
    name: 'Pro',
    price: 79,
    features: ['Everything in Premium', 'Live coaching', 'Priority support'],
  },
} as const;
