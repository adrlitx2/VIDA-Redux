import { createClient } from '@supabase/supabase-js';

// Create supabaseAdmin client for background management
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin
);

export interface StreamBackground {
  id: number;
  name: string;
  description?: string;
  category: string;
  image_url: string;
  thumbnail_url?: string;
  is_active: boolean;
  sort_order: number;
  required_plan: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BackgroundCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class StreamBackgroundManager {
  // Get all backgrounds for admin interface
  async getAllBackgrounds(): Promise<StreamBackground[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stream_backgrounds')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all backgrounds:', error);
      return this.getFallbackBackgrounds();
    }
  }

  // Get backgrounds filtered for a specific user (includes global + user's personal backgrounds)
  async getBackgroundsForUser(userId?: string): Promise<StreamBackground[]> {
    try {
      let query = supabaseAdmin
        .from('stream_backgrounds')
        .select('*')
        .eq('is_active', true);

      if (userId) {
        // Include global backgrounds (no created_by) and user's personal backgrounds
        query = query.or(`created_by.is.null,created_by.eq.${userId}`);
      } else {
        // If no user ID, only show global backgrounds
        query = query.is('created_by', null);
      }

      query = query
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user backgrounds:', error);
      return this.getFallbackBackgrounds();
    }
  }

  // Get active backgrounds for streaming interface
  async getActiveBackgrounds(): Promise<StreamBackground[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stream_backgrounds')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active backgrounds:', error);
      return this.getFallbackBackgrounds();
    }
  }

  // Get backgrounds by category
  async getBackgroundsByCategory(category: string): Promise<StreamBackground[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stream_backgrounds')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching backgrounds by category:', error);
      return this.getFallbackBackgrounds().filter(bg => bg.category === category);
    }
  }

  // Create new background
  async createBackground(background: Partial<StreamBackground>): Promise<StreamBackground> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stream_backgrounds')
        .insert([{
          name: background.name,
          description: background.description,
          category: background.category,
          image_url: background.image_url,
          thumbnail_url: background.thumbnail_url,
          is_active: background.is_active ?? true,
          sort_order: background.sort_order ?? 0,
          required_plan: background.required_plan ?? 'free',
          created_by: background.created_by,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating background:', error);
      throw new Error('Failed to create background');
    }
  }

  // Update background
  async updateBackground(id: number, data: Partial<StreamBackground>): Promise<StreamBackground | undefined> {
    try {
      const { data: updated, error } = await supabaseAdmin
        .from('stream_backgrounds')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    } catch (error) {
      console.error('Error updating background:', error);
      return undefined;
    }
  }

  // Delete background
  async deleteBackground(id: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('stream_backgrounds')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting background:', error);
      return false;
    }
  }

  // Delete category
  async deleteCategory(id: number): Promise<boolean> {
    try {
      // First get the category name to match with backgrounds
      const { data: category, error: categoryFetchError } = await supabaseAdmin
        .from('background_categories')
        .select('name')
        .eq('id', id)
        .single();

      if (categoryFetchError) throw categoryFetchError;

      // Delete all backgrounds in this category (using category name)
      const { error: backgroundsError } = await supabaseAdmin
        .from('stream_backgrounds')
        .delete()
        .eq('category', category.name.toLowerCase());

      if (backgroundsError) throw backgroundsError;

      // Then delete the category
      const { error: categoryError } = await supabaseAdmin
        .from('background_categories')
        .delete()
        .eq('id', id);

      if (categoryError) throw categoryError;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // Get all categories
  async getAllCategories(): Promise<BackgroundCategory[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('background_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return this.getFallbackCategories();
    }
  }

  // Create category
  async createCategory(category: Partial<BackgroundCategory>): Promise<BackgroundCategory> {
    try {
      const { data, error } = await supabaseAdmin
        .from('background_categories')
        .insert([{
          name: category.name,
          description: category.description,
          is_active: category.is_active ?? true,
          sort_order: category.sort_order ?? 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  // Initialize default backgrounds and categories (only on first run)
  async initializeDefaults(): Promise<void> {
    try {
      // Check if initialization has already been completed
      const { data: initFlag, error: flagError } = await supabaseAdmin
        .from('background_categories')
        .select('id')
        .eq('name', 'initialization_complete')
        .single();

      if (initFlag && !flagError) {
        // Initialization already completed, skip
        return;
      }

      // Create default categories
      const defaultCategories = [
        { name: 'bedroom', description: 'Bedroom-themed virtual backgrounds', sort_order: 1 },
        { name: 'office', description: 'Professional office environments', sort_order: 2 },
        { name: 'studio', description: 'Recording and broadcast studios', sort_order: 3 },
        { name: 'general', description: 'General purpose backgrounds', sort_order: 4 },
        { name: 'cosmic', description: 'Space and cosmic backgrounds', sort_order: 5 },
      ];

      for (const category of defaultCategories) {
        try {
          await this.createCategory(category);
        } catch (error) {
          // Category might already exist, continue
        }
      }

      // Create default bedroom backgrounds (only if no bedroom backgrounds exist)
      const existingBedroomBgs = await this.getBackgroundsByCategory('bedroom');
      if (existingBedroomBgs.length === 0) {
        const defaultBackgrounds = [
          {
            name: 'Pop Art Bedroom',
            description: 'Vibrant pop art styled bedroom with bold colors',
            category: 'bedroom',
            image_url: '/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png',
            is_active: true,
            sort_order: 1,
            required_plan: 'free',
          },
          {
            name: 'Neon Graffiti Bedroom',
            description: 'Modern bedroom with neon graffiti wall art',
            category: 'bedroom',
            image_url: '/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png',
            is_active: true,
            sort_order: 2,
            required_plan: 'free',
          },
          {
            name: 'Warhol Modern Bedroom',
            description: 'Contemporary bedroom inspired by Andy Warhol aesthetics',
            category: 'bedroom',
            image_url: '/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png',
            is_active: true,
            sort_order: 3,
            required_plan: 'free',
          },
        ];

        for (const background of defaultBackgrounds) {
          try {
            await this.createBackground(background);
          } catch (error) {
            // Background creation failed, continue
          }
        }
      }

      // Mark initialization as complete
      try {
        await this.createCategory({
          name: 'initialization_complete',
          description: 'Flag to indicate default initialization is complete',
          is_active: false,
          sort_order: 999
        });
      } catch (error) {
        // Flag creation failed, continue
      }

      console.log('✅ Default backgrounds and categories initialized');
    } catch (error) {
      console.error('Error initializing default backgrounds:', error);
    }
  }

  // Fallback data for when database is unavailable
  private getFallbackBackgrounds(): StreamBackground[] {
    return [
      {
        id: 1,
        name: 'Pop Art Bedroom',
        description: 'Vibrant pop art styled bedroom with bold colors',
        category: 'bedroom',
        image_url: '/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png',
        is_active: true,
        sort_order: 1,
        required_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Neon Graffiti Bedroom',
        description: 'Modern bedroom with neon graffiti wall art',
        category: 'bedroom',
        image_url: '/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png',
        is_active: true,
        sort_order: 2,
        required_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Warhol Modern Bedroom',
        description: 'Contemporary bedroom inspired by Andy Warhol aesthetics',
        category: 'bedroom',
        image_url: '/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png',
        is_active: true,
        sort_order: 3,
        required_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  private getFallbackCategories(): BackgroundCategory[] {
    return [
      {
        id: 1,
        name: 'Bedroom',
        description: 'Bedroom-themed virtual backgrounds',
        is_active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Nature',
        description: 'Natural landscape backgrounds',
        is_active: true,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Urban',
        description: 'City and urban environments',
        is_active: true,
        sort_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        name: 'Abstract',
        description: 'Abstract and artistic backgrounds',
        is_active: true,
        sort_order: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }
}

export const streamBackgroundManager = new StreamBackgroundManager();