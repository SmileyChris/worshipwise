/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // Resolve referenced collections
  const servicesCollection = app.findCollectionByNameOrId("services");
  if (!servicesCollection) {
    throw new Error("services collection not found");
  }

  // Create service_comments collection (without self-relation initially)
  const collection = new Collection({
    name: "service_comments",
    type: "base",
    fields: [
      // Comment text
      {
        type: "text",
        name: "comment",
        required: true,
        presentable: false,
        unique: false,
        min: 1,
        max: 2000
      },
      // Service relationship
      {
        type: "relation",
        name: "service_id",
        required: true,
        presentable: false,
        unique: false,
        collectionId: servicesCollection.id,
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1,
        displayFields: ["title"]
      },
      // User who posted the comment
      {
        type: "relation",
        name: "user_id",
        required: true,
        presentable: false,
        unique: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: ["name", "email"]
      },
      // Parent comment for threading will be added after initial save
      // Mentions - users mentioned in the comment
      {
        type: "relation",
        name: "mentions",
        required: false,
        presentable: false,
        unique: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 10,
        displayFields: ["name"]
      },
      // Edit history tracking
      {
        type: "bool",
        name: "edited",
        required: false,
        presentable: false,
        unique: false
      },
      {
        type: "date",
        name: "edited_at",
        required: false,
        presentable: false,
        unique: false,
        min: "",
        max: ""
      }
    ],
    indexes: [
      `CREATE INDEX idx_service_comments_service ON service_comments (service_id)`,
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
      @request.auth.id = user_id &&
      service_id.church_id = @request.auth.church_memberships_via_user_id.church_id
    `,
    updateRule: `
      user_id = @request.auth.id
    `,
    deleteRule: `
      @request.auth.id = user_id ||
      @request.auth.church_memberships_via_user_id.permissions ~ "manage-services"
    `,
    options: {}
  });

  try {
    app.save(collection);
    console.log("Successfully created service_comments collection (base)");
  } catch (e) {
    console.error("Failed to create service_comments collection:", e);
    throw e;
  }

  // Add self relation parent_id and index in a follow-up update
  try {
    const sc = app.findCollectionByNameOrId("service_comments");
    if (!sc) {
      throw new Error("service_comments collection not found after creation");
    }

    const parentField = new Field({
      type: "relation",
      name: "parent_id",
      required: false,
      presentable: false,
      unique: false,
      collectionId: sc.id,
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1,
      displayFields: ["comment"]
    });

    sc.fields = [...sc.fields, parentField];
    sc.indexes = [
      ...sc.indexes,
      `CREATE INDEX idx_service_comments_parent ON service_comments (parent_id)`
    ];

    app.save(sc);
    console.log("Added parent_id field and index to service_comments");
  } catch (e) {
    console.error("Failed to add parent_id to service_comments:", e);
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
