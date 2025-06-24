/// <reference path="../pb_data/types.d.ts" />

/**
 * Add categories collection with church-based security
 * PocketBase v0.28+
 * Generated 2025-06-24
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  // Get the churches collection ID
  const churchesCollection = app.findCollectionByNameOrId("churches");
  if (!churchesCollection) {
    throw new Error("Churches collection not found");
  }

  /* ========== categories collection ================================= */
  {
    const c = new Collection({
      name: "categories",
      type: "base",

      // Church-scoped access rules
      listRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      viewRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",
      deleteRule: "@request.auth.id != '' && church_id ?= @request.auth.church_memberships_via_user_id.church_id",

      indexes: [
        "CREATE INDEX idx_categories_church_id ON categories (church_id)",
        "CREATE INDEX idx_categories_sort_order ON categories (sort_order)"
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
          type: "text",
          name: "name",
          required: true,
          max: 100
        },
        {
          type: "text",
          name: "description",
          max: 500
        },
        {
          type: "text",
          name: "color",
          max: 7,
          pattern: "^#[0-9A-Fa-f]{6}$"
        },
        {
          type: "number",
          name: "sort_order",
          required: true,
          min: 0,
          onlyInt: true
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
      console.log("Created categories collection successfully");
    } catch (e) {
      console.error("Failed to save categories collection:", e);
      throw e;
    }
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  try {
    const col = app.findCollectionByNameOrId("categories");
    app.delete(col);
    console.log("Deleted categories collection successfully");
  } catch (e) {
    console.error("Failed to delete categories collection:", e);
  }
});