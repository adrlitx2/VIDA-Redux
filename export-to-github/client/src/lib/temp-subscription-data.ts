// Temporary subscription data for immediate app access
export const defaultSubscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingInterval: 'monthly' as const,
    features: [
      '15 minutes streaming per week',
      'Basic avatar library',
      'Standard quality streaming',
      'Limited avatar editing'
    ],
    limits: {
      streamingMinutes: 15,
      avatarSlots: 1
    }
  },
  {
    id: 'reply-guy',
    name: 'Reply Guy',
    price: 9.99,
    billingInterval: 'monthly' as const,
    features: [
      '2 hours streaming per week',
      'Avatars and Rigging Studio access',
      'HD streaming quality',
      'Twitter Spaces integration'
    ],
    limits: {
      streamingMinutes: 120,
      avatarSlots: 3
    }
  },
  {
    id: 'spartan',
    name: 'Spartan',
    price: 29.99,
    billingInterval: 'monthly' as const,
    features: [
      '10 hours streaming per week',
      'Full Avatars and Rigging Studio',
      '4K streaming quality',
      'Advanced tracking features'
    ],
    limits: {
      streamingMinutes: 600,
      avatarSlots: 10
    }
  },
  {
    id: 'zeus',
    name: 'Zeus',
    price: 79.99,
    billingInterval: 'monthly' as const,
    features: [
      'Unlimited streaming',
      'Pro Avatars and Rigging Studio',
      'Professional features',
      'Priority support'
    ],
    limits: {
      streamingMinutes: -1, // unlimited
      avatarSlots: 50
    }
  },
  {
    id: 'goat',
    name: 'GOAT',
    price: 199.99,
    billingInterval: 'monthly' as const,
    features: [
      'Everything in Zeus',
      'Enterprise Avatars and Rigging Studio',
      'API access',
      'Custom integrations'
    ],
    limits: {
      streamingMinutes: -1,
      avatarSlots: -1 // unlimited
    }
  }
];

export const defaultUserSubscription = {
  id: 1,
  userId: '70972082-7f8c-475d-970a-aca686142a84',
  planId: 'free',
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

export const defaultAvatars = [
  {
    id: 1,
    userId: '70972082-7f8c-475d-970a-aca686142a84',
    name: 'Default Avatar',
    imageUrl: '/api/placeholder/300/300',
    modelUrl: '/models/default-avatar.glb',
    isActive: true,
    createdAt: new Date()
  }
];