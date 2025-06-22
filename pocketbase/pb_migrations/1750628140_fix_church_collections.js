/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // First, delete any existing problematic collections
  try {
    const churchCollection = app.findCollectionByNameOrId("churches");
    if (churchCollection) {
      app.delete(churchCollection);
    }
  } catch (e) {
    // Collection doesn't exist, continue
  }

  try {
    const membershipCollection = app.findCollectionByNameOrId("church_memberships");
    if (membershipCollection) {
      app.delete(membershipCollection);
    }
  } catch (e) {
    // Collection doesn't exist, continue
  }

  try {
    const invitationCollection = app.findCollectionByNameOrId("church_invitations");
    if (invitationCollection) {
      app.delete(invitationCollection);
    }
  } catch (e) {
    // Collection doesn't exist, continue
  }

  // Create churches collection with proper UUID
  const churchCollection = new Collection({
    "id": "pbc_4234985230",
    "created": "2024-12-21 23:16:42.000Z",
    "updated": "2024-12-21 23:16:42.000Z",
    "name": "churches",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "p6m4hgbz",
        "name": "name",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 200,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "a1b2c3d4",
        "name": "slug",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "e5f6g7h8",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 1000,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "i9j0k1l2",
        "name": "address",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 500,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "m3n4o5p6",
        "name": "city",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "q7r8s9t0",
        "name": "state",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "u1v2w3x4",
        "name": "country",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "y5z6a7b8",
        "name": "timezone",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "c9d0e1f2",
        "name": "hemisphere",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "northern",
            "southern"
          ]
        }
      },
      {
        "system": false,
        "id": "g3h4i5j6",
        "name": "subscription_type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "free",
            "basic",
            "premium"
          ]
        }
      },
      {
        "system": false,
        "id": "k7l8m9n0",
        "name": "subscription_status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "active",
            "trial",
            "suspended",
            "cancelled"
          ]
        }
      },
      {
        "system": false,
        "id": "o1p2q3r4",
        "name": "max_users",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "s5t6u7v8",
        "name": "max_songs",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "w9x0y1z2",
        "name": "max_storage_mb",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "a3b4c5d6",
        "name": "settings",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "e7f8g9h0",
        "name": "owner_user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "i1j2k3l4",
        "name": "billing_email",
        "type": "email",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "m5n6o7p8",
        "name": "is_active",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "options": {}
  });

  app.save(churchCollection);

  // Create church_memberships collection
  const membershipCollection = new Collection({
    "id": "pbc_4234985231",
    "created": "2024-12-21 23:16:43.000Z",
    "updated": "2024-12-21 23:16:43.000Z",
    "name": "church_memberships",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "church_rel",
        "name": "church_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "pbc_4234985230",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "user_rel01",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "role_field",
        "name": "role",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "member",
            "musician",
            "leader",
            "admin",
            "pastor"
          ]
        }
      },
      {
        "system": false,
        "id": "permissions",
        "name": "permissions",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "status_fld",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "active",
            "pending",
            "suspended"
          ]
        }
      },
      {
        "system": false,
        "id": "pref_keys1",
        "name": "preferred_keys",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "notif_pref",
        "name": "notification_preferences",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "invited_by",
        "name": "invited_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "inv_date01",
        "name": "invited_date",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "join_date1",
        "name": "joined_date",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "is_active1",
        "name": "is_active",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "options": {}
  });

  app.save(membershipCollection);

  // Create church_invitations collection
  const invitationCollection = new Collection({
    "id": "pbc_4234985232",
    "created": "2024-12-21 23:16:44.000Z",
    "updated": "2024-12-21 23:16:44.000Z",
    "name": "church_invitations",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "church_r01",
        "name": "church_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "pbc_4234985230",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "email_inv1",
        "name": "email",
        "type": "email",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "role_inv01",
        "name": "role",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "member",
            "musician",
            "leader",
            "admin",
            "pastor"
          ]
        }
      },
      {
        "system": false,
        "id": "perms_inv1",
        "name": "permissions",
        "type": "json",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 2000000
        }
      },
      {
        "system": false,
        "id": "inv_by_001",
        "name": "invited_by",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "token_inv1",
        "name": "token",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": 100,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "expires_01",
        "name": "expires_at",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "used_at_01",
        "name": "used_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "used_by_01",
        "name": "used_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "active_inv",
        "name": "is_active",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "options": {}
  });

  return app.save(invitationCollection);
}, (app) => {
  // Rollback - delete all collections
  try {
    const churchCollection = app.findCollectionByNameOrId("churches");
    if (churchCollection) app.delete(churchCollection);
  } catch (e) {}

  try {
    const membershipCollection = app.findCollectionByNameOrId("church_memberships");
    if (membershipCollection) app.delete(membershipCollection);
  } catch (e) {}

  try {
    const invitationCollection = app.findCollectionByNameOrId("church_invitations");
    if (invitationCollection) app.delete(invitationCollection);
  } catch (e) {}
});