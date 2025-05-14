// batch-update-users.js
const { createClient } = require('@supabase/supabase-js');

// Load from environment variables or hardcode for testing (never commit secrets!)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // Fetch all users (paginated)
  let page = 1;
  let users = [];
  let done = false;

  while (!done) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (data.users.length === 0) break;
    users = users.concat(data.users);
    if (data.users.length < 1000) done = true;
    else page++;
  }

  console.log(`Found ${users.length} users.`);

  // Define your default roles/permissions here
  const defaultRoles = ['user'];
  const defaultPermissions = [];

  // Update each user
  for (const user of users) {
    // Customize logic: skip admins, only update missing, etc.
    const currentRoles = user.user_metadata?.roles;
    const currentPermissions = user.user_metadata?.permissions;

    // Example: Only update if missing
    if (!currentRoles || !Array.isArray(currentRoles)) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          roles: defaultRoles,
          permissions: currentPermissions || defaultPermissions,
        },
      });
      if (error) {
        console.error(`Failed to update user ${user.email}:`, error.message);
      } else {
        console.log(`Updated user ${user.email} with roles: ${defaultRoles}`);
      }
    }
    // You can also update permissions similarly, or force update all users if needed
  }
}

main().catch((err) => {
  console.error('Batch update failed:', err);
  process.exit(1);
});