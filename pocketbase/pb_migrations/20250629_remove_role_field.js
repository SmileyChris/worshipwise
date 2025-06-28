/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // Get the church_memberships collection
  const collection = app.findCollectionByNameOrId("church_memberships");
  
  if (!collection) {
    console.error("church_memberships collection not found");
    return false;
  }

  // Find and remove the role field
  const roleFieldIndex = collection.fields.findIndex(f => f.name === "role");
  
  if (roleFieldIndex !== -1) {
    // Remove the role field
    collection.fields.splice(roleFieldIndex, 1);
    
    // Also remove the permissions field if it exists
    const permissionsFieldIndex = collection.fields.findIndex(f => f.name === "permissions");
    if (permissionsFieldIndex !== -1) {
      collection.fields.splice(permissionsFieldIndex, 1);
    }
    
    // Save the updated collection
    try {
      app.save(collection);
      console.log("Successfully removed role and permissions fields from church_memberships");
    } catch (e) {
      console.error("Failed to update church_memberships collection:", e);
      throw e;
    }
  } else {
    console.log("Role field not found in church_memberships - may have already been removed");
  }

  // Also update the church_invitations collection to remove role field
  const invitations = app.findCollectionByNameOrId("church_invitations");
  
  if (invitations) {
    const inviteRoleFieldIndex = invitations.fields.findIndex(f => f.name === "role");
    
    if (inviteRoleFieldIndex !== -1) {
      // Remove the role field
      invitations.fields.splice(inviteRoleFieldIndex, 1);
      
      // Also remove the permissions field if it exists
      const invitePermissionsFieldIndex = invitations.fields.findIndex(f => f.name === "permissions");
      if (invitePermissionsFieldIndex !== -1) {
        invitations.fields.splice(invitePermissionsFieldIndex, 1);
      }
      
      try {
        app.save(invitations);
        console.log("Successfully removed role and permissions fields from church_invitations");
      } catch (e) {
        console.error("Failed to update church_invitations collection:", e);
        throw e;
      }
    }
  }

  return true;
}, (app) => {
  // Revert migration - add back the role field
  const collection = app.findCollectionByNameOrId("church_memberships");
  
  if (!collection) {
    console.error("church_memberships collection not found");
    return false;
  }

  // Check if role field already exists
  const hasRoleField = collection.fields.some(f => f.name === "role");
  
  if (!hasRoleField) {
    // Add back the role field
    collection.fields.push({
      type: "select",
      name: "role",
      required: true,
      maxSelect: 1,
      values: ["musician", "leader", "admin"]
    });
    
    // Add back the permissions field
    collection.fields.push({
      type: "json",
      name: "permissions",
      required: true
    });
    
    try {
      app.save(collection);
      console.log("Successfully restored role and permissions fields to church_memberships");
    } catch (e) {
      console.error("Failed to restore fields:", e);
      throw e;
    }
  }

  // Also restore for invitations
  const invitations = app.findCollectionByNameOrId("church_invitations");
  
  if (invitations) {
    const hasInviteRoleField = invitations.fields.some(f => f.name === "role");
    
    if (!hasInviteRoleField) {
      invitations.fields.push({
        type: "select",
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["musician", "leader", "admin"]
      });
      
      invitations.fields.push({
        type: "json",
        name: "permissions",
        required: true
      });
      
      try {
        app.save(invitations);
        console.log("Successfully restored role and permissions fields to church_invitations");
      } catch (e) {
        console.error("Failed to restore invitation fields:", e);
        throw e;
      }
    }
  }

  return true;
});