import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { backgroundManager } from "./background-storage";

// Simplified storage extension for background management
export class StorageExtended {
  // Background management operations
  async getAllBackgrounds(): Promise<schema.StreamBackground[]> {
    return await backgroundManager.getAllBackgrounds();
  }

  async getActiveBackgrounds(): Promise<schema.StreamBackground[]> {
    return await backgroundManager.getActiveBackgrounds();
  }

  async getBackgroundsByCategory(category: string): Promise<schema.StreamBackground[]> {
    return await backgroundManager.getBackgroundsByCategory(category);
  }

  async createBackground(background: schema.InsertStreamBackground): Promise<schema.StreamBackground> {
    return await backgroundManager.createBackground(background);
  }

  async updateBackground(id: number, data: Partial<schema.StreamBackground>): Promise<schema.StreamBackground | undefined> {
    return await backgroundManager.updateBackground(id, data);
  }

  async deleteBackground(id: number): Promise<boolean> {
    return await backgroundManager.deleteBackground(id);
  }

  async getAllCategories(): Promise<schema.BackgroundCategory[]> {
    return await backgroundManager.getAllCategories();
  }

  async createCategory(category: schema.InsertBackgroundCategory): Promise<schema.BackgroundCategory> {
    return await backgroundManager.createCategory(category);
  }
}

export const storageExtended = new StorageExtended();