/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  const c = app;
  
  // Store collection IDs for relations
  const ids = {};

  /* ========== 1. roles collection =========================================== */
  {
    const roles = new Collection({
      name: "roles",
      type: "base",
      
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-church'",
      updateRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-church'",
      deleteRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-church' && is_builtin = false",
      
      indexes: [
        "CREATE UNIQUE INDEX idx_roles_unique ON roles (church_id, slug)"
      ],
      
      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: "churches",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "text", name: "name", required: true, max: 100 },
        { type: "text", name: "slug", required: true, max: 50, pattern: "^[a-z0-9-]+$" },
        { 
          type: "json", 
          name: "permissions", 
          required: true,
          // Default empty array
          options: { maxSize: 5000 }
        },
        { type: "bool", name: "is_builtin", options: { nonempty: false } }
      ]
    });

    try {
      app.save(roles);
      ids.roles = roles.id;
    } catch (e) {
      console.error("Failed to save roles collection:", e);
      throw e;
    }
  }

  /* ========== 2. user_roles collection =========================================== */
  {
    const userRoles = new Collection({
      name: "user_roles",
      type: "base",
      
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      updateRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      deleteRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      
      indexes: [
        "CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles (church_id, user_id, role_id)"
      ],
      
      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: "churches",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "user_id", 
          required: true,
          collectionId: "_pb_users_auth_",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "role_id", 
          required: true,
          collectionId: ids.roles,
          maxSelect: 1, 
          cascadeDelete: true 
        }
      ]
    });

    try {
      app.save(userRoles);
      ids.userRoles = userRoles.id;
    } catch (e) {
      console.error("Failed to save user_roles collection:", e);
      throw e;
    }
  }

  /* ========== 3. skills collection =========================================== */
  {
    const skills = new Collection({
      name: "skills",
      type: "base",
      
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      updateRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      deleteRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members' && is_builtin = false",
      
      indexes: [
        "CREATE UNIQUE INDEX idx_skills_unique ON skills (church_id, slug)"
      ],
      
      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: "churches",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "text", name: "name", required: true, max: 100 },
        { type: "text", name: "slug", required: true, max: 50, pattern: "^[a-z0-9-]+$" },
        { type: "bool", name: "is_builtin", options: { nonempty: false } }
      ]
    });

    try {
      app.save(skills);
      ids.skills = skills.id;
    } catch (e) {
      console.error("Failed to save skills collection:", e);
      throw e;
    }
  }

  /* ========== 4. user_skills collection =========================================== */
  {
    const userSkills = new Collection({
      name: "user_skills",
      type: "base",
      
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      updateRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      deleteRule: "@request.auth.church_memberships_via_user_id.church_id ?= church_id && @request.auth.church_memberships_via_user_id.user_roles_via_user_id.role_id.permissions ?~ 'manage-members'",
      
      indexes: [
        "CREATE UNIQUE INDEX idx_user_skills_unique ON user_skills (church_id, user_id, skill_id)"
      ],
      
      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: "churches",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "user_id", 
          required: true,
          collectionId: "_pb_users_auth_",
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "skill_id", 
          required: true,
          collectionId: ids.skills,
          maxSelect: 1, 
          cascadeDelete: true 
        }
      ]
    });

    try {
      app.save(userSkills);
      ids.userSkills = userSkills.id;
    } catch (e) {
      console.error("Failed to save user_skills collection:", e);
      throw e;
    }
  }

  /* ========== 5. Migrate existing data =========================================== */
  
  // Get all churches
  const churches = app.findCollectionByNameOrId("churches");
  const churchRecords = app.findAllRecords(churches);
  
  churchRecords.forEach((church) => {
    try {
      // Create admin role for this church
      const adminRole = new Record(app.findCollectionByNameOrId("roles"), {
        church_id: church.id,
        name: "Administrator",
        slug: "admin",
        permissions: [
          "manage-songs",
          "manage-services", 
          "manage-members",
          "manage-church"
        ],
        is_builtin: false
      });
      app.save(adminRole);
      
      // Create leader skill for this church
      const leaderSkill = new Record(app.findCollectionByNameOrId("skills"), {
        church_id: church.id,
        name: "Worship Leader",
        slug: "leader",
        is_builtin: true
      });
      app.save(leaderSkill);
      
      // Get all memberships for this church
      const memberships = app.findCollectionByNameOrId("church_memberships");
      const membershipRecords = app.findRecordsByFilter(
        memberships,
        `church_id = "${church.id}"`
      );
      
      membershipRecords.forEach((membership) => {
        // Assign roles based on old role field
        if (membership.get("role") === "admin") {
          // Assign admin role
          const userRole = new Record(app.findCollectionByNameOrId("user_roles"), {
            church_id: church.id,
            user_id: membership.get("user_id"),
            role_id: adminRole.id
          });
          app.save(userRole);
        }
        
        // Assign leader skill to those with leader or admin role
        if (membership.get("role") === "leader" || membership.get("role") === "admin") {
          const userSkill = new Record(app.findCollectionByNameOrId("user_skills"), {
            church_id: church.id,
            user_id: membership.get("user_id"),
            skill_id: leaderSkill.id
          });
          app.save(userSkill);
        }
      });
      
    } catch (e) {
      console.error(`Failed to migrate data for church ${church.id}:`, e);
    }
  });

  return true;
}, (app) => {
  // Revert migration
  try {
    app.deleteCollection("user_skills");
  } catch (e) {
    console.log("user_skills collection doesn't exist");
  }
  
  try {
    app.deleteCollection("skills");
  } catch (e) {
    console.log("skills collection doesn't exist");
  }
  
  try {
    app.deleteCollection("user_roles");
  } catch (e) {
    console.log("user_roles collection doesn't exist");
  }
  
  try {
    app.deleteCollection("roles");
  } catch (e) {
    console.log("roles collection doesn't exist");
  }
  
  return true;
});