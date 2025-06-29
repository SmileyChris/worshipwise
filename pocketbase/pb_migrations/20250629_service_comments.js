/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  // Create service_comments collection
  const collection = new Collection({
    id: "service_comments",
    name: "service_comments",
    type: "base",
    fields: [
      // Comment text
      new Field({
        id: "comment",
        name: "comment",
        type: "text",
        required: true,
        presentable: false,
        unique: false,
        options: {
          min: 1,
          max: 2000
        }
      }),
      // Service relationship
      new Field({
        id: "service_id",
        name: "service_id",
        type: "relation",
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "services",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["title"]
        }
      }),
      // User who posted the comment
      new Field({
        id: "user_id",
        name: "user_id",
        type: "relation",
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["name", "email"]
        }
      }),
      // Parent comment for threading (optional)
      new Field({
        id: "parent_id",
        name: "parent_id",
        type: "relation",
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: "service_comments",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["comment"]
        }
      }),
      // Mentions - users mentioned in the comment
      new Field({
        id: "mentions",
        name: "mentions",
        type: "relation",
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 10,
          displayFields: ["name"]
        }
      }),
      // Edit history tracking
      new Field({
        id: "edited",
        name: "edited",
        type: "bool",
        required: false,
        presentable: false,
        unique: false,
        options: {}
      }),
      new Field({
        id: "edited_at",
        name: "edited_at",
        type: "date",
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: "",
          max: ""
        }
      })
    ],
    indexes: [
      `CREATE INDEX idx_service_comments_service ON service_comments (service_id)`,
      `CREATE INDEX idx_service_comments_user ON service_comments (user_id)`,
      `CREATE INDEX idx_service_comments_parent ON service_comments (parent_id)`
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
      @request.auth.id = user_id &&
      @request.data.user_id = user_id &&
      @request.data.service_id = service_id
    `,
    deleteRule: `
      @request.auth.id = user_id ||
      @request.auth.church_memberships_via_user_id.permissions ~ "manage-services"
    `,
    options: {}
  });

  try {
    app.save(collection);
    console.log("Successfully created service_comments collection");
  } catch (e) {
    console.error("Failed to create service_comments collection:", e);
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