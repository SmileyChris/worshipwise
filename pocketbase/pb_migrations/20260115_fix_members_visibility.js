/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // 1. Update Users Collection Rules
  // Allow authenticated users to view other users (necessary for 'expand: user_id' to work)
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  
  // Ideally we would restrict this to shared church membership, but for now allow all auth users
  // to ensure immediate fix. "Shared church" rule is complex to write correctly for 'users' collection.
  users.listRule = "@request.auth.id != ''";
  users.viewRule = "@request.auth.id != ''";
  
  app.save(users);
  console.log("Updated users collection rules");

  // 2. Update Church Memberships Rules
  const memberships = app.findCollectionByNameOrId("church_memberships");
  
  // Allow members to view all memberships in their church
  // Old rule was: user_id = @request.auth.id (only see self)
  memberships.listRule = "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id";
  memberships.viewRule = "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id";
  
  // Allow admins (manage-members) to update/delete memberships
  // We use the same pattern as in flexible_permissions.js
  memberships.updateRule = `@request.auth.id != '' && (
    user_id = @request.auth.id || 
    (@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members')
  )`;
  
  memberships.deleteRule = `@request.auth.id != '' && (
    @request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'
  )`;

  app.save(memberships);
  console.log("Updated church_memberships collection rules");

}, (app) => {
  // Revert changes (Note: this reverts to the strict/broken state from remove_role_field.js)
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  users.listRule = "@request.auth.id = id";
  users.viewRule = "@request.auth.id = id";
  app.save(users);

  const memberships = app.findCollectionByNameOrId("church_memberships");
  memberships.listRule = "@request.auth.id != '' && user_id = @request.auth.id";
  memberships.viewRule = "@request.auth.id != '' && user_id = @request.auth.id";
  memberships.updateRule = "@request.auth.id != '' && user_id = @request.auth.id";
  memberships.deleteRule = "@request.auth.id != ''"; // This was also broken in prev migration, practically unusable for admins
  app.save(memberships);
});
