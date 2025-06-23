/// <reference path="../pb_data/types.d.ts" />

/**
 * Add church_id foreign keys to songs, services, and song_usage collections
 * This enforces the church-centric multi-tenant architecture
 * PocketBase v0.28+
 * Generated 2025-06-23
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  // Get the churches collection ID
  const churchesCollection = app.findCollectionByNameOrId("churches");
  if (!churchesCollection) {
    throw new Error("Churches collection not found");
  }

  /* ========== 1. Add church_id to songs ============================= */
  {
    const songsCollection = app.findCollectionByNameOrId("songs");
    if (!songsCollection) {
      throw new Error("Songs collection not found");
    }

    // Create new relation field
    const churchIdField = new Field({
      type: "relation",
      name: "church_id",
      required: true,
      collectionId: churchesCollection.id,
      maxSelect: 1,
      cascadeDelete: true
    });

    // Add church_id field at the beginning
    const existingFields = songsCollection.fields;
    songsCollection.fields = [churchIdField, ...existingFields];

    // Update access rules to include church scoping
    songsCollection.listRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songsCollection.viewRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songsCollection.createRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songsCollection.updateRule = "@request.auth.id != '' && created_by = @request.auth.id && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songsCollection.deleteRule = "@request.auth.id != '' && created_by = @request.auth.id && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";

    try {
      app.save(songsCollection);
    } catch (e) {
      console.error("Failed to update songs collection:", e);
      throw e;
    }
  }

  /* ========== 2. Add church_id to services ========================== */
  {
    const servicesCollection = app.findCollectionByNameOrId("services");
    if (!servicesCollection) {
      throw new Error("Services collection not found");
    }

    // Create new relation field
    const churchIdField = new Field({
      type: "relation",
      name: "church_id",
      required: true,
      collectionId: churchesCollection.id,
      maxSelect: 1,
      cascadeDelete: true
    });

    // Add church_id field at the beginning
    const existingFields = servicesCollection.fields;
    servicesCollection.fields = [churchIdField, ...existingFields];

    // Update access rules to include church scoping
    servicesCollection.listRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    servicesCollection.viewRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    servicesCollection.createRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    servicesCollection.updateRule = "@request.auth.id != '' && created_by = @request.auth.id && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    servicesCollection.deleteRule = "@request.auth.id != '' && created_by = @request.auth.id && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";

    try {
      app.save(servicesCollection);
    } catch (e) {
      console.error("Failed to update services collection:", e);
      throw e;
    }
  }

  /* ========== 3. Add church_id to song_usage ======================= */
  {
    const songUsageCollection = app.findCollectionByNameOrId("song_usage");
    if (!songUsageCollection) {
      throw new Error("Song usage collection not found");
    }

    // Create new relation field
    const churchIdField = new Field({
      type: "relation",
      name: "church_id",
      required: true,
      collectionId: churchesCollection.id,
      maxSelect: 1,
      cascadeDelete: true
    });

    // Add church_id field at the beginning
    const existingFields = songUsageCollection.fields;
    songUsageCollection.fields = [churchIdField, ...existingFields];

    // Update access rules to include church scoping
    songUsageCollection.listRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songUsageCollection.viewRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";
    songUsageCollection.createRule = "@request.auth.id != '' && church_id.id ?= @request.auth.church_memberships_via_user.church_id.id";

    try {
      app.save(songUsageCollection);
    } catch (e) {
      console.error("Failed to update song_usage collection:", e);
      throw e;
    }
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  /* ========== Remove church_id from collections ==================== */
  
  // Remove church_id from songs
  {
    try {
      const songsCollection = app.findCollectionByNameOrId("songs");
      if (songsCollection) {
        // Remove church_id field
        songsCollection.fields = songsCollection.fields.filter(field => field.name !== "church_id");
        
        // Restore original access rules
        songsCollection.listRule = "@request.auth.id != ''";
        songsCollection.viewRule = "@request.auth.id != ''";
        songsCollection.createRule = "@request.auth.id != ''";
        songsCollection.updateRule = "@request.auth.id != '' && created_by = @request.auth.id";
        songsCollection.deleteRule = "@request.auth.id != '' && created_by = @request.auth.id";
        
        app.save(songsCollection);
      }
    } catch (e) {
      console.error("Failed to revert songs collection:", e);
    }
  }

  // Remove church_id from services
  {
    try {
      const servicesCollection = app.findCollectionByNameOrId("services");
      if (servicesCollection) {
        // Remove church_id field
        servicesCollection.fields = servicesCollection.fields.filter(field => field.name !== "church_id");
        
        // Restore original access rules
        servicesCollection.listRule = "@request.auth.id != ''";
        servicesCollection.viewRule = "@request.auth.id != ''";
        servicesCollection.createRule = "@request.auth.id != ''";
        servicesCollection.updateRule = "@request.auth.id != '' && created_by = @request.auth.id";
        servicesCollection.deleteRule = "@request.auth.id != '' && created_by = @request.auth.id";
        
        app.save(servicesCollection);
      }
    } catch (e) {
      console.error("Failed to revert services collection:", e);
    }
  }

  // Remove church_id from song_usage
  {
    try {
      const songUsageCollection = app.findCollectionByNameOrId("song_usage");
      if (songUsageCollection) {
        // Remove church_id field
        songUsageCollection.fields = songUsageCollection.fields.filter(field => field.name !== "church_id");
        
        // Restore original access rules
        songUsageCollection.listRule = "@request.auth.id != ''";
        songUsageCollection.viewRule = "@request.auth.id != ''";
        songUsageCollection.createRule = "@request.auth.id != ''";
        
        app.save(songUsageCollection);
      }
    } catch (e) {
      console.error("Failed to revert song_usage collection:", e);
    }
  }
});