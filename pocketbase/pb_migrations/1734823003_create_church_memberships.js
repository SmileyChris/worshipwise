/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = new Collection({
    "id": "church_memberships_id",
    "created": "2024-12-21 23:16:43.000Z",
    "updated": "2024-12-21 23:16:43.000Z",
    "name": "church_memberships",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "membership_church_id",
        "name": "church_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "church_collection_id",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "membership_user_id",
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
        "id": "membership_role",
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
        "id": "membership_permissions",
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
        "id": "membership_status",
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
        "id": "membership_preferred_keys",
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
        "id": "membership_notification_preferences",
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
        "id": "membership_invited_by",
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
        "id": "membership_invited_date",
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
        "id": "membership_joined_date",
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
        "id": "membership_is_active",
        "name": "is_active",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_church_memberships_church_user` ON `church_memberships` (`church_id`, `user_id`)",
      "CREATE INDEX `idx_church_memberships_church_id` ON `church_memberships` (`church_id`)",
      "CREATE INDEX `idx_church_memberships_user_id` ON `church_memberships` (`user_id`)"
    ],
    "listRule": "@request.auth.id != '' && (user_id = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "viewRule": "@request.auth.id != '' && (user_id = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "createRule": "@request.auth.id != '' && (church_id.owner_user_id = @request.auth.id || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "updateRule": "@request.auth.id != '' && (user_id = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "deleteRule": "@request.auth.id != '' && (church_id.owner_user_id = @request.auth.id || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "options": {}
  });

  return dao.saveCollection(collection);
}, (db) => {
  // Rollback - delete church_memberships collection
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("church_memberships");
  return dao.deleteCollection(collection);
});