import { ensureSuperAdminExists, setUserRole, getAllUsersWithRoles } from '../admin-tools/supabase-admin';

/**
 * Simple script to create a superadmin user for VIDA³
 * Run with:
 * npx tsx server/scripts/setup-admin.ts
 */
async function main() {
  // Admin account details
  const adminEmail = "admin@vida3.ai";
  const adminPassword = "Admin123!"; // Please change this in production
  const adminUsername = "admin";

  console.log("Setting up VIDA³ superadmin account...");

  try {
    // Create or verify superadmin
    const result = await ensureSuperAdminExists(adminEmail, adminPassword, adminUsername);
    
    if (result.success) {
      console.log(`✅ Superadmin account setup successfully with ID: ${result.userId}`);
      
      // List all users with roles
      console.log("\nCurrent users in the system:");
      const users = await getAllUsersWithRoles();
      
      users.forEach(user => {
        console.log(`- ${user.email} (${user.id}): ${user.role.toUpperCase()}`);
      });
      
      console.log("\nYou can now log in with:");
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log("\nIMPORTANT: Change this password after logging in for the first time!");
    } else {
      console.error("❌ Failed to setup superadmin account:", result.error);
    }
  } catch (error) {
    console.error("❌ Error setting up superadmin account:", error);
  }
}

// Run the script
main()
  .then(() => {
    console.log("\nDone. You can now access the admin dashboard at /admin/dashboard");
    process.exit(0);
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });