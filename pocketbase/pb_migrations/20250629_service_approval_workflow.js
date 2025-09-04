/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    throw new Error("services collection not found");
  }

  // Add approval_status field
  const approvalStatusField = new Field({
    id: "approval_status",
    name: "approval_status",
    type: "select",
    required: false,
    presentable: false,
    unique: false,
    maxSelect: 1,
    values: [
      "not_required",
      "pending_approval",
      "approved",
      "rejected",
      "changes_requested"
    ]
  });

  // Add approval_requested_at field
  const approvalRequestedAtField = new Field({
    id: "approval_requested_at",
    name: "approval_requested_at",
    type: "date",
    required: false,
    presentable: false,
    unique: false
  });

  // Add approval_requested_by field
  const approvalRequestedByField = new Field({
    id: "approval_requested_by",
    name: "approval_requested_by",
    type: "relation",
    required: false,
    presentable: false,
    unique: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 1
  });

  // Add approved_by field
  const approvedByField = new Field({
    id: "approved_by",
    name: "approved_by",
    type: "relation",
    required: false,
    presentable: false,
    unique: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 1
  });

  // Add approval_date field
  const approvalDateField = new Field({
    id: "approval_date",
    name: "approval_date",
    type: "date",
    required: false,
    presentable: false,
    unique: false
  });

  // Add approval_notes field
  const approvalNotesField = new Field({
    id: "approval_notes",
    name: "approval_notes",
    type: "text",
    required: false,
    presentable: false,
    unique: false,
    max: 1000
  });

  // Try to add the fields
  try {
    collection.fields.add(approvalStatusField);
    console.log("Added approval_status field to services collection");
  } catch (e) {
    console.log("approval_status field already exists in services collection");
  }

  try {
    collection.fields.add(approvalRequestedAtField);
    console.log("Added approval_requested_at field to services collection");
  } catch (e) {
    console.log("approval_requested_at field already exists in services collection");
  }

  try {
    collection.fields.add(approvalRequestedByField);
    console.log("Added approval_requested_by field to services collection");
  } catch (e) {
    console.log("approval_requested_by field already exists in services collection");
  }

  try {
    collection.fields.add(approvedByField);
    console.log("Added approved_by field to services collection");
  } catch (e) {
    console.log("approved_by field already exists in services collection");
  }

  try {
    collection.fields.add(approvalDateField);
    console.log("Added approval_date field to services collection");
  } catch (e) {
    console.log("approval_date field already exists in services collection");
  }

  try {
    collection.fields.add(approvalNotesField);
    console.log("Added approval_notes field to services collection");
  } catch (e) {
    console.log("approval_notes field already exists in services collection");
  }
  
  try {
    app.save(collection);
    console.log("Successfully updated services collection with approval fields");
  } catch (e) {
    console.error("Failed to update services collection:", e);
    throw e;
  }
}, (app) => {
  // Revert migration - remove the approval fields
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    throw new Error("services collection not found");
  }

  const fieldsToRemove = [
    "approval_status",
    "approval_requested_at",
    "approval_requested_by",
    "approved_by",
    "approval_date",
    "approval_notes"
  ];

  fieldsToRemove.forEach(fieldId => {
    try {
      collection.fields.removeById(fieldId);
      console.log(`Removed ${fieldId} field from services collection`);
    } catch (e) {
      console.log(`${fieldId} field not found or already removed`);
    }
  });
  
  try {
    app.save(collection);
    console.log("Successfully reverted services collection");
  } catch (e) {
    console.error("Failed to revert services collection:", e);
    throw e;
  }
});

