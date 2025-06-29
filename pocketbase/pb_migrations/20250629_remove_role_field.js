/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // Get the church_memberships collection
  const collection = app.findCollectionByNameOrId("church_memberships");
  
  if (!collection) {
    console.error("church_memberships collection not found");
    throw new Error("church_memberships collection not found");
  }

  // First update the access rules to remove references to 'role' field
  collection.listRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.viewRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.deleteRule = "@request.auth.id != ''";

  // Remove the role field if it exists
  try {
    collection.fields.removeById("role");
    console.log("Removed role field from church_memberships");
  } catch (e) {
    console.log("Role field not found or already removed");
  }
  
  // Remove the permissions field if it exists
  try {
    collection.fields.removeById("permissions");
    console.log("Removed permissions field from church_memberships");
  } catch (e) {
    console.log("Permissions field not found or already removed");
  }

  // Save the updated collection
  try {
    app.save(collection);
    console.log("Successfully updated church_memberships collection");
  } catch (e) {
    console.error("Failed to update church_memberships collection:", e);
    throw e;
  }

  // Also update the church_invitations collection to remove role field
  const invitations = app.findCollectionByNameOrId("church_invitations");
  
  if (invitations) {
    // Update access rules if needed
    // Remove the role field if it exists
    try {
      invitations.fields.removeById("role");
      console.log("Removed role field from church_invitations");
    } catch (e) {
      console.log("Role field not found in invitations or already removed");
    }
    
    // Remove the permissions field if it exists
    try {
      invitations.fields.removeById("permissions");
      console.log("Removed permissions field from church_invitations");
    } catch (e) {
      console.log("Permissions field not found in invitations or already removed");
    }
    
    try {
      app.save(invitations);
      console.log("Successfully updated church_invitations collection");
    } catch (e) {
      console.error("Failed to update church_invitations collection:", e);
      throw e;
    }
  }
}, (app) => {
  // Revert migration - add back the role field
  const collection = app.findCollectionByNameOrId("church_memberships");
  
  if (!collection) {
    console.error("church_memberships collection not found");
    throw new Error("church_memberships collection not found");
  }

  // Restore the original access rules
  collection.listRule = "@request.auth.id != '' && user_id = @request.auth.id";
  collection.viewRule = "@request.auth.id != '' && (user_id = @request.auth.id || role = 'admin')";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != '' && (user_id = @request.auth.id || role = 'admin')";
  collection.deleteRule = "@request.auth.id != '' && role = 'admin'";

  // Add back the role field
  const roleField = new Field({
    id: "role",
    name: "role",
    type: "select",
    required: true,
    presentable: false,
    unique: false,
    options: {
      maxSelect: 1,
      values: ["musician", "leader", "admin"]
    }
  });
  
  try {
    collection.fields.add(roleField);
  } catch (e) {
    console.log("Role field already exists");
  }
  
  // Add back the permissions field
  const permissionsField = new Field({
    id: "permissions",
    name: "permissions",
    type: "json",
    required: true,
    presentable: false,
    unique: false,
    options: {
      maxSize: 5000
    }
  });
  
  try {
    collection.fields.add(permissionsField);
  } catch (e) {
    console.log("Permissions field already exists");
  }
  
  try {
    app.save(collection);
    console.log("Successfully restored fields to church_memberships");
  } catch (e) {
    console.error("Failed to restore fields:", e);
    throw e;
  }

  // Also restore for invitations
  const invitations = app.findCollectionByNameOrId("church_invitations");
  
  if (invitations) {
    const inviteRoleField = new Field({
      id: "role",
      name: "role",
      type: "select",
      required: true,
      presentable: false,
      unique: false,
      options: {
        maxSelect: 1,
        values: ["musician", "leader", "admin"]
      }
    });
    
    try {
      invitations.fields.add(inviteRoleField);
    } catch (e) {
      console.log("Role field already exists in invitations");
    }
    
    const invitePermissionsField = new Field({
      id: "permissions",
      name: "permissions",
      type: "json",
      required: true,
      presentable: false,
      unique: false,
      options: {
        maxSize: 5000
      }
    });
    
    try {
      invitations.fields.add(invitePermissionsField);
    } catch (e) {
      console.log("Permissions field already exists in invitations");
    }
    
    try {
      app.save(invitations);
      console.log("Successfully restored fields to church_invitations");
    } catch (e) {
      console.error("Failed to restore invitation fields:", e);
      throw e;
    }
  }
});