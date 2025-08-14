import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthHeaders } from "./auth-helper";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Use Supabase auth token if available
  let headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  try {
    // Get auth headers from helper
    const authHeaders = await getAuthHeaders();
    if (authHeaders.Authorization) {
      headers = { ...headers, ...authHeaders };
      console.log('Auth token found and added to headers');
    } else {
      console.warn('No auth token found in storage');
    }
  } catch (error) {
    console.warn('Failed to get auth token from storage:', error);
  }
  
  // Use relative URLs for API calls in Replit environment
  const backendUrl = url.startsWith('/api') ? url : url;
  
  console.log('Making fetch request to:', backendUrl);
  console.log('Request headers:', headers);
  console.log('Request method:', method);
  console.log('Request body:', data ? JSON.stringify(data) : 'undefined');

  // Dynamic timeout based on request type - auto-rigging needs more time for AI processing
  const isAutoRigging = url.includes('/auto-rig');
  const timeoutMs = isAutoRigging ? 30000 : 15000; // 30s for auto-rigging, 15s for others
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(backendUrl, {
      method,
      headers: {
        ...headers,
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      mode: 'cors',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('Fetch completed successfully');

    console.log('Fetch response status:', res.status);
    console.log('Fetch response OK:', res.ok);

    // Don't throw for 404 on avatar requests - return empty array instead
    if (url.includes('/api/avatars') && res.status === 404) {
      return [];
    }

    await throwIfResNotOk(res);
    
    // Parse response with timeout protection
    const responseText = await res.text();
    console.log('Response text received, length:', responseText.length);
    
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('Successfully parsed JSON response');
      return parsedResponse;
    } catch (e) {
      console.log('Response is not JSON, returning as text');
      return responseText;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutSeconds = isAutoRigging ? 30 : 15;
      console.error(`Request timed out after ${timeoutSeconds} seconds`);
      throw new Error(`Request timeout - the server took too long to respond (${timeoutSeconds}s limit)`);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add auth headers for queries too
    let headers: Record<string, string> = {};
    
    try {
      // Get auth headers from helper
      const authHeaders = await getAuthHeaders();
      if (authHeaders.Authorization) {
        headers = { ...headers, ...authHeaders };
      }
    } catch (error) {
      console.warn('Failed to get auth token from storage:', error);
    }

    // Use relative URLs for API calls in Replit environment
    const url = queryKey[0] as string;
    const backendUrl = url.startsWith('/api') ? url : url;
    
    const res = await fetch(backendUrl, {
      headers: {
        ...headers,
        'Accept': 'application/json',
      },
      mode: 'cors',
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Global cache invalidation utility for subscription plans
export const invalidateSubscriptionCache = () => {
  // Clear all subscription-related cache immediately
  queryClient.removeQueries({ queryKey: ["/api/admin/subscription-plans"] });
  queryClient.removeQueries({ queryKey: ["/api/subscription/plans"] });
  
  // Force cache invalidation and refetch
  queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
  queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
  
  // Immediate refetch to update UI
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: ["/api/admin/subscription-plans"] });
    queryClient.refetchQueries({ queryKey: ["/api/subscription/plans"] });
  }, 50);
};