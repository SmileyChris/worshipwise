/// <reference path="../pb_data/types.d.ts" />

/**
 * Add labels relation field to songs collection
 * PocketBase v0.28+
 * Generated 2025-01-14
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  // Get the collections
  const songsCollection = app.findCollectionByNameOrId("songs");
  const labelsCollection = app.findCollectionByNameOrId("labels");

  if (!songsCollection) {
    throw new Error("Songs collection not found");
  }
  if (!labelsCollection) {
    throw new Error("Labels collection not found");
  }

  // Add labels relation field to songs
  songsCollection.fields.addAt(
    -1, // Add at end
    new Field({
      type: "relation",
      name: "labels",
      required: false,
      collectionId: labelsCollection.id,
      maxSelect: 999, // Allow multiple labels per song
      cascadeDelete: false
    })
  );

  try {
    app.save(songsCollection);
    console.log("Added labels field to songs collection successfully");
  } catch (e) {
    console.error("Failed to add labels field to songs collection:", e);
    throw e;
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  try {
    const songsCollection = app.findCollectionByNameOrId("songs");

    // Remove the labels field
    const labelsField = songsCollection.fields.getByName("labels");
    if (labelsField) {
      songsCollection.fields.remove(labelsField.id);
      app.save(songsCollection);
      console.log("Removed labels field from songs collection successfully");
    }
  } catch (e) {
    console.error("Failed to remove labels field from songs collection:", e);
  }
});
