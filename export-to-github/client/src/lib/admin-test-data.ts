// Test data for admin dashboard

// Dashboard stats
export const dashboardStats = {
  totalUsers: 4328,
  newUsers: 247,
  userGrowth: 18.5,
  totalStreams: 12589,
  activeStreams: 34,
  streamGrowth: 22.4,
  monthlyRevenue: 15.7,
  annualRevenue: 187.2,
  revenueGrowth: 12.8,
  totalAvatars: 8927,
  newAvatars: 143,
  avatarGrowth: 15.2,
  recentActivity: [
    {
      user: "Alex Johnson",
      action: "Started stream",
      date: "Just now",
      status: "Active"
    },
    {
      user: "Maria Garcia",
      action: "Purchased avatar",
      date: "5 min ago",
      status: "Completed"
    },
    {
      user: "Jamal Wilson",
      action: "Upgraded subscription",
      date: "1 hour ago",
      status: "Completed"
    },
    {
      user: "Sarah Kim",
      action: "Payment processing",
      date: "2 hours ago",
      status: "Pending"
    },
    {
      user: "David Chen",
      action: "Avatar upload",
      date: "3 hours ago",
      status: "Failed"
    }
  ]
};

// User data
export const users = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "alexj",
    email: "alex@example.com",
    role: "superadmin",
    status: "active",
    joinDate: "2023-01-15",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "Zeus",
    lastActive: "2023-05-21"
  },
  {
    id: "2",
    name: "Maria Garcia",
    username: "mariag",
    email: "maria@example.com",
    role: "admin",
    status: "active",
    joinDate: "2023-02-21",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "Spartan",
    lastActive: "2023-05-22"
  },
  {
    id: "3",
    name: "Jamal Wilson",
    username: "jamalw",
    email: "jamal@example.com",
    role: "user",
    status: "active",
    joinDate: "2023-03-10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "Zeus",
    lastActive: "2023-05-20"
  },
  {
    id: "4",
    name: "Sarah Kim",
    username: "sarahk",
    email: "sarah@example.com",
    role: "user",
    status: "pending",
    joinDate: "2023-04-05",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "Free",
    lastActive: "2023-05-19"
  },
  {
    id: "5",
    name: "David Chen",
    username: "davidc",
    email: "david@example.com",
    role: "user",
    status: "suspended",
    joinDate: "2023-02-28",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "Reply Guy",
    lastActive: "2023-05-15"
  },
  {
    id: "6",
    name: "Emma Wilson",
    username: "emmaw",
    email: "emma@example.com",
    role: "admin",
    status: "active",
    joinDate: "2023-01-20",
    avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    subscriptionTier: "GOAT",
    lastActive: "2023-05-22"
  }
];

// Marketplace items
export const marketplaceItems = [
  {
    id: "1",
    name: "Neon Glow Outfit",
    description: "A flashy outfit with neon accents perfect for standing out in any stream.",
    price: 19.99,
    category: "Clothing",
    image: "https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: true,
    featured: true,
    sales: 342,
    rating: 4.8
  },
  {
    id: "2",
    name: "Cyberpunk Headset",
    description: "Futuristic headset with glowing elements and customizable colors.",
    price: 14.99,
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1559893088-c0787ebfc084?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: true,
    featured: false,
    sales: 189,
    rating: 4.5
  },
  {
    id: "3",
    name: "Galaxy Hair Pack",
    description: "Set of cosmic-inspired hairstyles with animated star effects.",
    price: 24.99,
    category: "Hair",
    image: "https://images.unsplash.com/photo-1618799805265-71f588163596?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: true,
    featured: true,
    sales: 273,
    rating: 4.9
  },
  {
    id: "4",
    name: "Retro Wave Background",
    description: "80s inspired animated background for your streams.",
    price: 9.99,
    category: "Backgrounds",
    image: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: true,
    featured: false,
    sales: 417,
    rating: 4.7
  },
  {
    id: "5",
    name: "Anime Eyes Bundle",
    description: "Collection of expressive anime-style eyes for your avatar.",
    price: 12.99,
    category: "Features",
    image: "https://images.unsplash.com/photo-1573950940509-d924ee3fd345?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: false,
    featured: false,
    sales: 156,
    rating: 4.6
  },
  {
    id: "6",
    name: "Stream Emotes Pack",
    description: "Set of 20 custom animated emotes for your streaming channel.",
    price: 29.99,
    category: "Emotes",
    image: "https://images.unsplash.com/photo-1560807707-8cc77767d783?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    available: true,
    featured: true,
    sales: 528,
    rating: 4.9
  }
];

// Subscription data
export const subscriptions = {
  plans: [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: [
        "15 minutes streaming/week",
        "Basic avatar customization",
        "Public streams only",
        "Standard quality"
      ],
      activeUsers: 2843,
      active: true,
      featured: false
    },
    {
      id: "reply-guy",
      name: "Reply Guy",
      price: 9.99,
      features: [
        "1 hour streaming/week",
        "Advanced avatar customization",
        "Public & private streams",
        "HD quality"
      ],
      activeUsers: 986,
      active: true,
      featured: false
    },
    {
      id: "spartan",
      name: "Spartan",
      price: 19.99,
      features: [
        "5 hours streaming/week",
        "Premium avatar customization",
        "Twitter Spaces integration",
        "Full HD quality",
        "Priority support"
      ],
      activeUsers: 647,
      active: true,
      featured: true
    },
    {
      id: "zeus",
      name: "Zeus",
      price: 49.99,
      features: [
        "Unlimited streaming",
        "All avatar features",
        "Multi-platform integration",
        "4K quality",
        "VIP support",
        "Custom backgrounds"
      ],
      activeUsers: 273,
      active: true,
      featured: false
    }
  ],
  recent: [
    {
      user: "Alex Johnson",
      plan: "Zeus",
      date: "Today",
      amount: 49.99,
      status: "active"
    },
    {
      user: "Maria Garcia",
      plan: "Spartan",
      date: "Yesterday",
      amount: 19.99,
      status: "active"
    },
    {
      user: "Jamal Wilson",
      plan: "Zeus",
      date: "May 20, 2023",
      amount: 49.99,
      status: "active"
    },
    {
      user: "David Chen",
      plan: "Reply Guy",
      date: "May 18, 2023",
      amount: 9.99,
      status: "canceled"
    },
    {
      user: "Emma Wilson",
      plan: "GOAT",
      date: "May 15, 2023",
      amount: 99.99,
      status: "active"
    }
  ]
};