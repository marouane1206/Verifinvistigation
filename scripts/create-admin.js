/**
 * Script to create admin user in Supabase
 * Run with: node scripts/create-admin.js
 *
 * This script creates an admin user with the credentials from .env file
 */

import { createClient } from "@supabase/supabase-js";

// Hardcoded values from .env file
const supabaseUrl = "https://qeyfzmtylwxmlgeprnmi.supabase.co";
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFleWZ6bXR5bHd4bWxnZXBybm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMwMTA3MCwiZXhwIjoyMDg5ODc3MDcwfQ.6Oa1xmbMsewM-l1J8SoVZLWLA0CeAHwfCQwrY7jtOpU";
const adminEmail = "admin@verifinvestigation.org";
const adminPassword = "Admin@2024!Secure";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  console.log(`Creating admin user: ${adminEmail}`);

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === adminEmail
    );

    if (existingUser) {
      console.log("Admin user already exists, updating role...");

      // Update the profile to have admin role
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", existingUser.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      } else {
        console.log("Admin role updated successfully!");
      }

      console.log(`Admin user ID: ${existingUser.id}`);
      return;
    }

    // Create new admin user
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirmed: true,
        user_metadata: {
          role: "admin",
          username: "admin",
        },
      });

    if (createError) {
      console.error("Error creating user:", createError);
      process.exit(1);
    }

    // Ensure email is confirmed using updateUserById
    const { error: confirmError } =
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        email_confirm: true,
      });

    if (confirmError) {
      console.error("Error confirming email:", confirmError);
    } else {
      console.log("Admin email confirmed successfully!");
    }

    console.log("Admin user created successfully!");
    console.log(`Admin user ID: ${userData.user.id}`);
    console.log("");
    console.log("You can now login at /admin/login with:");
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createAdminUser();
