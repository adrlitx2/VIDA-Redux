import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class BackgroundManager {
  // Get all backgrounds for admin interface
  async getAllBackgrounds(): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .orderBy(schema.streamBackgrounds.sortOrder, schema.streamBackgrounds.name);
  }

  // Get active backgrounds for streaming interface
  async getActiveBackgrounds(): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .where(eq(schema.streamBackgrounds.isActive, true))
      .orderBy(schema.streamBackgrounds.sortOrder, schema.streamBackgrounds.name);
  }

  // Get backgrounds by category
  async getBackgroundsByCategory(category: string): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .where(and(
        eq(schema.streamBackgrounds.category, category),
        eq(schema.streamBackgrounds.isActive, true)
      ))
      .orderBy(schema.streamBackgrounds.sortOrder, schema.streamBackgrounds.name);
  }

  // Create new background
  async createBackground(background: schema.InsertStreamBackground): Promise<schema.StreamBackground> {
    const [newBackground] = await db
      .insert(schema.streamBackgrounds)
      .values(background)
      .returning();
    
    return newBackground;
  }

  // Update background
  async updateBackground(id: number, data: Partial<schema.StreamBackground>): Promise<schema.StreamBackground | undefined> {
    try {
      const [updatedBackground] = await db
        .update(schema.streamBackgrounds)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.streamBackgrounds.id, id))
        .returning();
      
      return updatedBackground;
    } catch (error) {
      console.error('Error updating background:', error);
      return undefined;
    }
  }

  // Delete background
  async deleteBackground(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.streamBackgrounds)
        .where(eq(schema.streamBackgrounds.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting background:', error);
      return false;
    }
  }

  // Get all categories
  async getAllCategories(): Promise<schema.BackgroundCategory[]> {
    return await db
      .select()
      .from(schema.backgroundCategories)
      .where(eq(schema.backgroundCategories.isActive, true))
      .orderBy(schema.backgroundCategories.sortOrder, schema.backgroundCategories.name);
  }

  // Create category
  async createCategory(category: schema.InsertBackgroundCategory): Promise<schema.BackgroundCategory> {
    const [newCategory] = await db
      .insert(schema.backgroundCategories)
      .values(category)
      .returning();
    
    return newCategory;
  }

  // Initialize default backgrounds and categories
  async initializeDefaults(): Promise<void> {
    try {
      // Create default categories
      const defaultCategories = [
        { name: 'Bedroom', description: 'Bedroom-themed virtual backgrounds', sortOrder: 1 },
        { name: 'Nature', description: 'Natural landscape backgrounds', sortOrder: 2 },
        { name: 'Urban', description: 'City and urban environments', sortOrder: 3 },
        { name: 'Abstract', description: 'Abstract and artistic backgrounds', sortOrder: 4 },
        { name: 'Office', description: 'Professional office environments', sortOrder: 5 },
      ];

      for (const category of defaultCategories) {
        try {
          await this.createCategory(category);
        } catch (error) {
          // Category might already exist, continue
        }
      }

      // Create default bedroom backgrounds
      const defaultBackgrounds = [
        {
          name: 'Pop Art Bedroom',
          description: 'Vibrant pop art styled bedroom with bold colors',
          category: 'bedroom',
          imageUrl: '/@fs/home/runner/workspace/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png',
          isActive: true,
          sortOrder: 1,
          requiredPlan: 'free' as const,
        },
        {
          name: 'Neon Graffiti Bedroom',
          description: 'Modern bedroom with neon graffiti wall art',
          category: 'bedroom',
          imageUrl: '/@fs/home/runner/workspace/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png',
          isActive: true,
          sortOrder: 2,
          requiredPlan: 'free' as const,
        },
        {
          name: 'Warhol Modern Bedroom',
          description: 'Contemporary bedroom inspired by Andy Warhol aesthetics',
          category: 'bedroom',
          imageUrl: '/@fs/home/runner/workspace/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png',
          isActive: true,
          sortOrder: 3,
          requiredPlan: 'free' as const,
        },
        {
          name: 'Forest Nature',
          description: 'Serene forest landscape background',
          category: 'nature',
          imageUrl: '/api/placeholder/forest',
          isActive: true,
          sortOrder: 10,
          requiredPlan: 'free' as const,
        },
        {
          name: 'City Skyline',
          description: 'Modern city skyline at twilight',
          category: 'urban',
          imageUrl: '/api/placeholder/city',
          isActive: true,
          sortOrder: 20,
          requiredPlan: 'pro' as const,
        },
        {
          name: 'Space Nebula',
          description: 'Cosmic nebula and stars background',
          category: 'abstract',
          imageUrl: '/api/placeholder/space',
          isActive: true,
          sortOrder: 30,
          requiredPlan: 'premium' as const,
        },
      ];

      for (const background of defaultBackgrounds) {
        try {
          await this.createBackground(background);
        } catch (error) {
          // Background might already exist, continue
        }
      }

      console.log('✅ Default backgrounds and categories initialized');
    } catch (error) {
      console.error('Error initializing default backgrounds:', error);
    }
  }
}

export const backgroundManager = new BackgroundManager();