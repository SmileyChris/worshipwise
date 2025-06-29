/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    throw new Error("services collection not found");
  }

  // Add team_skills field as JSON to store skill-based assignments
  // Format: { "skill_id": "user_id", ... }
  const teamSkillsField = new Field({
    id: "team_skills",
    name: "team_skills",
    type: "json",
    required: false,
    presentable: false,
    unique: false,
    options: {
      maxSize: 5000
    }
  });

  // Try to add the field
  try {
    collection.fields.add(teamSkillsField);
    console.log("Added team_skills field to services collection");
  } catch (e) {
    console.log("team_skills field already exists in services collection");
  }
  
  try {
    app.save(collection);
    console.log("Successfully updated services collection");
  } catch (e) {
    console.error("Failed to update services collection:", e);
    throw e;
  }
}, (app) => {
  // Revert migration - remove the team_skills field
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    throw new Error("services collection not found");
  }

  try {
    collection.fields.removeById("team_skills");
    console.log("Removed team_skills field from services collection");
  } catch (e) {
    console.log("team_skills field not found or already removed");
  }
  
  try {
    app.save(collection);
    console.log("Successfully reverted services collection");
  } catch (e) {
    console.error("Failed to revert services collection:", e);
    throw e;
  }
});