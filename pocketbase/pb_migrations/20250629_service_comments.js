/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // Resolve related collection IDs
  const servicesCol = app.findCollectionByNameOrId("services");
  if (!servicesCol) {
    throw new Error("services collection not found");
  }
  const usersCol = app.findCollectionByNameOrId("users");
  const usersId = usersCol?.id || "_pb_users_auth_";

  // Create service_comments collection (initially without self-relation parent_id)
  const collection = new Collection({
    name: "service_comments",
    type: "base",
    fields: [
      { type: "text", name: "comment", required: true, min: 1, max: 2000 },
      { type: "relation", name: "service_id", required: true, collectionId: servicesCol.id, maxSelect: 1, cascadeDelete: true },
      { type: "relation", name: "user_id", required: true, collectionId: usersId, maxSelect: 1 },
      { type: "relation", name: "mentions", collectionId: usersId, maxSelect: 10 },
      { type: "bool", name: "edited" },
      { type: "date", name: "edited_at" }
    ],
    indexes: [
      `CREATE INDEX idx_service_comments_service ON service_comments (service_id)`,
      `CREATE INDEX idx_service_comments_user ON service_comments (user_id)`
      `CREATE INDEX idx_service_comments_user ON service_comments (user_id)`
    ],
    listRule: `
      @request.auth.id != "" && 
      service_id.church_id = @request.auth.church_memberships_via_user_id.church_id
    `,
    viewRule: `
      @request.auth.id != "" && 
      service_id.church_id = @request.auth.church_memberships_via_user_id.church_id
    `,
    createRule: `
      @request.auth.id != "" && 
      user_id = @request.auth.id &&
      service_id.church_id = @request.auth.church_memberships_via_user_id.church_id
    `,
    updateRule: `
      user_id = @request.auth.id &&
      service_id.church_id = @request.auth.church_memberships_via_user_id.church_id
    `,
    deleteRule: `
      (user_id = @request.auth.id && service_id.church_id = @request.auth.church_memberships_via_user_id.church_id) ||
      (@request.auth.church_memberships_via_user_id.church_id ?= service_id.church_id && @request.auth.church_memberships_via_user_id.permissions ~ "manage-services")
    `,
    options: {}
  });

  try {
    app.save(collection);
    console.log("Successfully created service_comments collection (base)");
    console.log("Successfully created service_comments collection (base)");
  } catch (e) {
    console.error("Failed to create service_comments collection:", e);
    throw e;
  }

  // Add self-relation parent_id field and its index
  try {
    const sc = app.findCollectionByNameOrId("service_comments");
    if (!sc) throw new Error("service_comments collection not found after creation");

    const parentField = new Field({
      type: "relation",
      name: "parent_id",
      collectionId: sc.id,
      maxSelect: 1
    });
    sc.fields = [...sc.fields, parentField];
    sc.indexes = [
      ...sc.indexes,
      `CREATE INDEX idx_service_comments_parent ON service_comments (parent_id)`
    ];

    app.save(sc);
    console.log("Added parent_id self-relation and index to service_comments");
  } catch (e) {
    console.error("Failed to add parent_id field to service_comments:", e);
    throw e;
  }
}, (app) => {
  // Revert migration - delete the collection
  try {
    const collection = app.findCollectionByNameOrId("service_comments");
    if (collection) {
      app.delete(collection);
      console.log("Successfully deleted service_comments collection");
    }
  } catch (e) {
    console.error("Failed to delete service_comments collection:", e);
    throw e;
  }
});

