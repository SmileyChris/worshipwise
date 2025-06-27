/// <reference path="../pb_data/types.d.ts" />

/**
 * Add labels collection with church-based security
 * PocketBase v0.28+
 * Generated 2025-06-27
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  // Get the churches and users collection IDs
  const churchesCollection = app.findCollectionByNameOrId("churches");
  const usersCollection = app.findCollectionByNameOrId("users");
  
  if (!churchesCollection) {
    throw new Error("Churches collection not found");
  }
  if (!usersCollection) {
    throw new Error("Users collection not found");
  }

  /* ========== labels collection ================================= */
  {
    const c = new Collection({
      name: "labels",
      type: "base",

      // Church-scoped access rules
      listRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      viewRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      createRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      updateRule: "@request.auth.id != '' && (created_by = @request.auth.id || @request.auth.church_memberships_via_user_id.role ?= 'admin')",
      deleteRule: "@request.auth.id != '' && (created_by = @request.auth.id || @request.auth.church_memberships_via_user_id.role ?= 'admin')",

      indexes: [
        "CREATE INDEX idx_labels_church_id ON labels (church_id)",
        "CREATE INDEX idx_labels_created_by ON labels (created_by)",
        "CREATE UNIQUE INDEX idx_labels_church_name ON labels (church_id, name)"
      ],

      fields: [
        {
          type: "relation",
          name: "church_id",
          required: true,
          collectionId: churchesCollection.id,
          maxSelect: 1,
          cascadeDelete: true
        },
        {
          type: "relation",
          name: "created_by",
          required: true,
          collectionId: usersCollection.id,
          maxSelect: 1,
          cascadeDelete: false
        },
        {
          type: "text",
          name: "name",
          required: true,
          max: 50
        },
        {
          type: "text",
          name: "description",
          max: 200
        },
        {
          type: "text",
          name: "color",
          max: 7,
          pattern: "^#[0-9A-Fa-f]{6}$"
        },
        {
          type: "bool",
          name: "is_active",
          required: true
        }
      ]
    });

    try {
      app.save(c);
      console.log("Created labels collection successfully");
    } catch (e) {
      console.error("Failed to save labels collection:", e);
      throw e;
    }
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  try {
    const col = app.findCollectionByNameOrId("labels");
    app.delete(col);
    console.log("Deleted labels collection successfully");
  } catch (e) {
    console.error("Failed to delete labels collection:", e);
  }
});