// Subscription pricing tiers
export const tiers = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for trying out VIDA³",
    features: [
      "10 pre-rigged avatars",
      "15 min/week streaming",
      "Basic avatar controls"
    ]
  },
  {
    id: "reply_guy",
    name: "Reply Guy",
    price: 20,
    description: "For casual creators",
    features: [
      "1 custom avatar",
      "1 hour/week streaming",
      "Twitter Spaces emulator",
      "Basic avatar controls"
    ]
  },
  {
    id: "spartan",
    name: "Spartan",
    price: 99,
    description: "For dedicated streamers",
    features: [
      "5 custom avatars",
      "20 hours/week streaming",
      "HD export",
      "Advanced rigging tools",
      "Priority support"
    ]
  },
  {
    id: "zeus",
    name: "Zeus",
    price: 149,
    description: "For professional creators",
    features: [
      "Unlimited avatars",
      "50 hours/week streaming",
      "1080p export",
      "AI lipsync preview",
      "Priority support"
    ]
  },
  {
    id: "goat",
    name: "GOAT",
    price: 200,
    description: "For elite content creators",
    features: [
      "Everything in Zeus",
      "4K export",
      "Concurrent streams",
      "Animation studio access",
      "White-glove support"
    ]
  }
];

// Add-on products
export const addOns = [
  {
    id: "stream_hours",
    name: "+10 Stream Hours",
    price: 15,
    description: "Extend your streaming time"
  },
  {
    id: "voice_clone",
    name: "AI Voice Clone",
    price: 9.99,
    description: "Per session voice cloning"
  },
  {
    id: "avatar_gen",
    name: "Avatar Auto-Gen",
    price: 5,
    description: "5 generation credits"
  },
  {
    id: "marketplace",
    name: "Marketplace Access",
    price: 10,
    description: "Premium avatar assets"
  },
  {
    id: "priority_support",
    name: "Priority Support",
    price: 25,
    description: "24/7 dedicated help"
  }
];

// Avatar types and presets
export const avatarPresets = [
  {
    id: "preset1",
    name: "Default Human",
    thumbnailUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96",
    type: "preset"
  },
  {
    id: "preset2",
    name: "Fantasy Elf",
    thumbnailUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96",
    type: "preset"
  },
  {
    id: "preset3",
    name: "Robot",
    thumbnailUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96",
    type: "preset"
  },
  {
    id: "preset4",
    name: "Cartoon Hero",
    thumbnailUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96",
    type: "preset"
  },
  {
    id: "preset5",
    name: "Animal Character",
    thumbnailUrl: "https://images.unsplash.com/photo-1640552435388-a54879e72b28?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96",
    type: "preset"
  }
];

// Streaming expressions and animations
export const expressions = [
  { id: "neutral", name: "Neutral" },
  { id: "happy", name: "Happy" },
  { id: "sad", name: "Sad" },
  { id: "surprised", name: "Surprised" },
  { id: "angry", name: "Angry" },
  { id: "disgusted", name: "Disgusted" },
  { id: "fearful", name: "Fearful" },
  { id: "contempt", name: "Contempt" }
];

export const animations = [
  { id: "idle", name: "Idle" },
  { id: "speaking", name: "Speaking" },
  { id: "excited", name: "Excited" },
  { id: "thinking", name: "Thinking" },
  { id: "nodding", name: "Nodding" },
  { id: "waving", name: "Waving" },
  { id: "dancing", name: "Dancing" },
  { id: "pointing", name: "Pointing" }
];

export const backgrounds = [
  { id: "studio", name: "Studio" },
  { id: "space", name: "Space" },
  { id: "cyberpunk", name: "Cyberpunk City" },
  { id: "forest", name: "Forest" },
  { id: "beach", name: "Beach" },
  { id: "abstract", name: "Abstract" },
  { id: "gradient", name: "Gradient" },
  { id: "custom", name: "Custom..." }
];

export const voiceModifiers = [
  { id: "none", name: "None" },
  { id: "deep", name: "Deep" },
  { id: "high", name: "High Pitch" },
  { id: "robot", name: "Robot" },
  { id: "echo", name: "Echo" },
  { id: "helium", name: "Helium" },
  { id: "reverb", name: "Reverb" }
];

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
    GOOGLE: "/api/auth/google",
    TWITTER: "/api/auth/twitter"
  },
  SUBSCRIPTION: {
    PLANS: "/api/subscription/plans",
    CURRENT: "/api/subscription",
    CREATE: "/api/subscription",
    CANCEL: "/api/subscription",
    ADDONS: "/api/subscription/addons",
    PURCHASE_ADDON: "/api/subscription/addon"
  },
  AVATAR: {
    LIST: "/api/avatars",
    GENERATE: "/api/avatars/generate",
    UPLOAD: "/api/avatars/upload",
    DELETE: "/api/avatars/{id}",
    UPDATE: "/api/avatars/{id}"
  },
  STREAM: {
    START: "/api/stream/start",
    STOP: "/api/stream/stop",
    STATUS: "/api/stream/status"
  },
  ADMIN: {
    STATS: "/api/admin/stats",
    USERS: "/api/admin/users",
    USER: "/api/admin/users/{id}",
    BLOCK_USER: "/api/admin/users/{id}/block",
    AVATARS: "/api/admin/avatars",
    STREAMS: "/api/admin/streams",
    SUBSCRIPTIONS: "/api/admin/subscriptions",
    GPU: "/api/admin/gpu"
  }
};
