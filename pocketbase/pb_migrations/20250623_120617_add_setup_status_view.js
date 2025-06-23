/// <reference path="../pb_data/types.d.ts" />

/**
 * Add setup_status view for anonymous setup checking
 * PocketBase v0.28+
 * Generated 2025-06-23
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  /* ========== setup_status (view) ============================= */
  {
    const c = new Collection({
      name: "setup_status",
      type: "view",
      
      // Anonymous access - no authentication required
      listRule: "",
      viewRule: "",
      
      viewQuery: `SELECT 
        1 as id,
        (CASE WHEN (SELECT COUNT(*) FROM churches) > 0 THEN 'false' ELSE 'true' END) as setup_required`,

      fields: [
        { type: "number", name: "id", required: true, readonly: true },
        { type: "text", name: "setup_required", required: true, readonly: true }
      ]
    });

    try {
      app.save(c);
      console.log("Created setup_status view successfully");
    } catch (e) {
      console.error("Failed to save setup_status view:", e);
      throw e;
    }
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  try {
    const col = app.findCollectionByNameOrId("setup_status");
    app.delete(col);
    console.log("Deleted setup_status view successfully");
  } catch (e) {
    console.error("Failed to delete setup_status view:", e);
  }
});