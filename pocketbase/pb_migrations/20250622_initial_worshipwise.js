/// <reference path="../pb_data/types.d.ts" />

/**
 * WorshipWise – initial schema
 * PocketBase v0.28+
 * Generated 2025-06-23
 *
 *  UP   → creates 7 collections + junction table, indexes, rules
 *  DOWN → drops them in reverse order
 */
migrate(
/* ---------------------------------------------------------------- UP -- */
(app) => {
  /* helper to remember collection IDs for relations ------------------- */
  const ids = {};

  /* ========== 1. churches =========================================== */
  {
    const c = new Collection({
      name: "churches",
      type: "base",
      
      /* basic ACL -- tighten later in hooks or filters */
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner_user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner_user_id = @request.auth.id",

      indexes: [
        "CREATE UNIQUE INDEX idx_churches_slug ON churches (slug)"
      ],

      fields: [
        { type: "text", name: "name", required: true, max: 200 },
        { type: "text", name: "slug", required: true, max: 100 },
        { type: "text", name: "description", max: 1000 },
        { type: "text", name: "address", max: 500 },
        { type: "text", name: "city", max: 100 },
        { type: "text", name: "state", max: 100 },
        { type: "text", name: "country", max: 100 },
        { type: "text", name: "timezone", required: true, max: 100 },
        { 
          type: "select", 
          name: "hemisphere", 
          required: true,
          maxSelect: 1, 
          values: ["northern","southern"] 
        },
        { type: "json", name: "settings", required: true },
        { 
          type: "relation", 
          name: "owner_user_id",  
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "email", name: "billing_email" },
        { type: "bool", name: "is_active" }
      ]
    });

    try {
      app.save(c);
      ids.churches = c.id;
    } catch (e) {
      console.error("Failed to save churches collection:", e);
      throw e;
    }
  }

  /* ========== 2. church_memberships ================================= */
  {
    const c = new Collection({
      name: "church_memberships",
      type: "base",

      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && (user_id = @request.auth.id || role = 'admin')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && (user_id = @request.auth.id || role = 'admin')",
      deleteRule: "@request.auth.id != '' && role = 'admin'",

      indexes: [
        "CREATE UNIQUE INDEX idx_memberships_unique ON church_memberships (church_id, user_id)"
      ],

      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: ids.churches, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "user_id", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "select", 
          name: "role", 
          required: true,
          maxSelect: 1,
          values: ["musician","leader","admin"] 
        },
        { type: "json", name: "permissions", required: true },
        { 
          type: "select", 
          name: "status", 
          required: true,
          maxSelect: 1,
          values: ["active","pending","suspended"] 
        },
        { type: "json", name: "preferred_keys" },
        { type: "json", name: "notification_preferences" },
        { 
          type: "relation", 
          name: "invited_by",
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { type: "date", name: "invited_date" },
        { type: "date", name: "joined_date" },
        { type: "bool", name: "is_active" }
      ]
    });

    try {
      app.save(c);
      ids.memberships = c.id;
    } catch (e) {
      console.error("Failed to save church_memberships collection:", e);
      throw e;
    }
  }

  /* ========== 3. church_invitations ================================= */
  {
    const c = new Collection({
      name: "church_invitations",
      type: "base",

      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",

      indexes: [
        "CREATE UNIQUE INDEX idx_church_invitation_token ON church_invitations (token)"
      ],

      fields: [
        { 
          type: "relation", 
          name: "church_id", 
          required: true,
          collectionId: ids.churches, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "email", name: "email", required: true },
        { 
          type: "select", 
          name: "role", 
          required: true,
          maxSelect: 1,
          values: ["musician","leader","admin"] 
        },
        { type: "json", name: "permissions", required: true },
        { 
          type: "relation", 
          name: "invited_by", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { type: "text", name: "token", required: true, max: 100 },
        { type: "date", name: "expires_at", required: true },
        { type: "date", name: "used_at" },
        { 
          type: "relation", 
          name: "used_by",
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { type: "bool", name: "is_active" }
      ]
    });

    try {
      app.save(c);
      ids.invitations = c.id;
    } catch (e) {
      console.error("Failed to save church_invitations collection:", e);
      throw e;
    }
  }

  /* ========== 4. songs ============================================== */
  {
    const KEY_SIGS = [
      "C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B",
      "Am","A#m","Bbm","Bm","Cm","C#m","Dbm","Dm","D#m","Ebm","Em","Fm","F#m","Gbm","Gm","G#m","Abm"
    ];

    const c = new Collection({
      name: "songs",
      type: "base",

      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && created_by = @request.auth.id",
      deleteRule: "@request.auth.id != '' && created_by = @request.auth.id",

      fields: [
        { type: "text", name: "title", required: true, max: 200 },
        { type: "text", name: "artist", max: 100 },
        { 
          type: "select", 
          name: "key_signature",
          maxSelect: 1, 
          values: KEY_SIGS 
        },
        { type: "number", name: "tempo", min: 60, max: 200, onlyInt: true },
        { type: "number", name: "duration_seconds", min: 30, max: 1800, onlyInt: true },
        { type: "json", name: "tags" },
        { type: "editor", name: "lyrics" },
        { 
          type: "file", 
          name: "chord_chart",
          maxSelect: 1,
          maxSize: 10*1024*1024, 
          mimeTypes: ["application/pdf","image/*"] 
        },
        { 
          type: "file", 
          name: "audio_file",
          maxSelect: 1,
          maxSize: 50*1024*1024, 
          mimeTypes: ["audio/mpeg","audio/mp3"] 
        },
        { 
          type: "file", 
          name: "sheet_music",
          maxSelect: 3,
          maxSize: 10*1024*1024, 
          mimeTypes: ["application/pdf"] 
        },
        { type: "text", name: "ccli_number", max: 20 },
        { type: "text", name: "copyright_info", max: 500 },
        { type: "editor", name: "notes" },
        { 
          type: "relation", 
          name: "created_by", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { type: "bool", name: "is_active" },
        { type: "json", name: "lyrics_analysis" }
      ]
    });

    try {
      app.save(c);
      ids.songs = c.id;
    } catch (e) {
      console.error("Failed to save songs collection:", e);
      throw e;
    }
  }

  /* ========== 5. services =========================================== */
  {
    const c = new Collection({
      name: "services",
      type: "base",

      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && created_by = @request.auth.id",
      deleteRule: "@request.auth.id != '' && created_by = @request.auth.id",

      fields: [
        { type: "text", name: "title", required: true, max: 200 },
        { type: "date", name: "service_date", required: true },
        { 
          type: "select", 
          name: "service_type",
          maxSelect: 1,
          values: ["Sunday Morning","Sunday Evening","Wednesday Night","Special Event","Rehearsal","Other"] 
        },
        { type: "text", name: "theme", max: 300 },
        { type: "editor", name: "notes" },
        { 
          type: "relation", 
          name: "worship_leader", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { 
          type: "relation", 
          name: "team_members",
          collectionId: "_pb_users_auth_", 
          maxSelect: 10 
        },
        { 
          type: "select", 
          name: "status", 
          required: true,
          maxSelect: 1,
          values: ["draft","planned","in_progress","completed","archived"] 
        },
        { type: "number", name: "estimated_duration", min: 300, max: 7200, onlyInt: true },
        { type: "number", name: "actual_duration", min: 300, max: 7200, onlyInt: true },
        { 
          type: "relation", 
          name: "created_by", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { type: "bool", name: "is_template" }
      ]
    });

    try {
      app.save(c);
      ids.services = c.id;
    } catch (e) {
      console.error("Failed to save services collection:", e);
      throw e;
    }
  }

  /* ========== 6. service_songs ======================================= */
  {
    const KEY_SIGS = [
      "C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B",
      "Am","A#m","Bbm","Bm","Cm","C#m","Dbm","Dm","D#m","Ebm","Em","Fm","F#m","Gbm","Gm","G#m","Abm"
    ];

    const c = new Collection({
      name: "service_songs",
      type: "base",

      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && added_by = @request.auth.id",
      deleteRule: "@request.auth.id != '' && added_by = @request.auth.id",

      indexes: [
        "CREATE UNIQUE INDEX idx_service_song_unique ON service_songs (service_id, order_position)"
      ],

      fields: [
        { 
          type: "relation", 
          name: "service_id", 
          required: true,
          collectionId: ids.services, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "song_id", 
          required: true,
          collectionId: ids.songs, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "number", name: "order_position", required: true, min: 1, max: 50, onlyInt: true },
        { 
          type: "select", 
          name: "transposed_key",
          maxSelect: 1, 
          values: KEY_SIGS 
        },
        { type: "number", name: "tempo_override", min: 60, max: 200, onlyInt: true },
        { type: "text", name: "transition_notes", max: 500 },
        { 
          type: "select", 
          name: "section_type",
          maxSelect: 1,
          values: ["Opening","Worship","Offering","Communion","Response","Closing"] 
        },
        { type: "number", name: "duration_override", min: 30, max: 1800, onlyInt: true },
        { 
          type: "relation", 
          name: "added_by", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        }
      ]
    });

    try {
      app.save(c);
      ids.serviceSongs = c.id;
    } catch (e) {
      console.error("Failed to save service_songs collection:", e);
      throw e;
    }
  }

  /* ========== 7. song_usage ========================================== */
  {
    const KEY_SIGS = [
      "C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B",
      "Am","A#m","Bbm","Bm","Cm","C#m","Dbm","Dm","D#m","Ebm","Em","Fm","F#m","Gbm","Gm","G#m","Abm"
    ];

    const c = new Collection({
      name: "song_usage",
      type: "base",

      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",

      fields: [
        { 
          type: "relation", 
          name: "song_id", 
          required: true,
          collectionId: ids.songs, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { 
          type: "relation", 
          name: "service_id", 
          required: true,
          collectionId: ids.services, 
          maxSelect: 1, 
          cascadeDelete: true 
        },
        { type: "date", name: "used_date", required: true },
        { 
          type: "select", 
          name: "used_key",
          maxSelect: 1, 
          values: KEY_SIGS 
        },
        { type: "number", name: "position_in_service", min: 1, max: 50, onlyInt: true },
        { 
          type: "relation", 
          name: "worship_leader", 
          required: true,
          collectionId: "_pb_users_auth_", 
          maxSelect: 1 
        },
        { 
          type: "select", 
          name: "service_type",
          maxSelect: 1,
          values: ["Sunday Morning","Sunday Evening","Wednesday Night","Special Event","Rehearsal","Other"] 
        }
      ]
    });

    try {
      app.save(c);
    } catch (e) {
      console.error("Failed to save song_usage collection:", e);
      throw e;
    }
  }
},

/* ------------------------------ DOWN ------------------------------ */
(app) => {
  for (const name of [
    "song_usage",
    "service_songs",
    "services",
    "songs",
    "church_invitations",
    "church_memberships",
    "churches"
  ]) {
    try {
      const col = app.findCollectionByNameOrId(name);
      app.delete(col);
    } catch {}
  }
});