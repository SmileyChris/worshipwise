/// <reference path="../pb_types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    return false;
  }

  // Add team_skills field as JSON to store skill-based assignments
  // Format: { "skill_id": "user_id", ... }
  const teamSkillsField = {
    type: "json",
    name: "team_skills",
    required: false,
    presentable: false,
    options: {
      maxSize: 5000
    }
  };

  // Check if field already exists
  const hasTeamSkillsField = collection.fields.some(f => f.name === "team_skills");
  
  if (!hasTeamSkillsField) {
    collection.fields.push(teamSkillsField);
    
    try {
      app.save(collection);
      console.log("Successfully added team_skills field to services collection");
    } catch (e) {
      console.error("Failed to update services collection:", e);
      throw e;
    }
  } else {
    console.log("team_skills field already exists in services collection");
  }

  return true;
}, (app) => {
  // Revert migration - remove the team_skills field
  const collection = app.findCollectionByNameOrId("services");
  
  if (!collection) {
    console.error("services collection not found");
    return false;
  }

  const fieldIndex = collection.fields.findIndex(f => f.name === "team_skills");
  
  if (fieldIndex !== -1) {
    collection.fields.splice(fieldIndex, 1);
    
    try {
      app.save(collection);
      console.log("Successfully removed team_skills field from services collection");
    } catch (e) {
      console.error("Failed to revert services collection:", e);
      throw e;
    }
  }

  return true;
});