/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = new Collection({
    "id": "church_invitations_id",
    "created": "2024-12-21 23:16:44.000Z",
    "updated": "2024-12-21 23:16:44.000Z",
    "name": "church_invitations",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "invitation_church_id",
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
        "id": "invitation_email",
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
        "id": "invitation_role",
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
        "id": "invitation_permissions",
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
        "id": "invitation_invited_by",
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
        "id": "invitation_token",
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
        "id": "invitation_expires_at",
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
        "id": "invitation_used_at",
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
        "id": "invitation_used_by",
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
        "id": "invitation_is_active",
        "name": "is_active",
        "type": "bool",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_church_invitations_token` ON `church_invitations` (`token`)",
      "CREATE INDEX `idx_church_invitations_church_id` ON `church_invitations` (`church_id`)",
      "CREATE INDEX `idx_church_invitations_email` ON `church_invitations` (`email`)"
    ],
    "listRule": "@request.auth.id != '' && (invited_by = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "viewRule": "@request.auth.id != '' && (invited_by = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "createRule": "@request.auth.id != '' && (church_id.owner_user_id = @request.auth.id || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "updateRule": "@request.auth.id != '' && (invited_by = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "deleteRule": "@request.auth.id != '' && (invited_by = @request.auth.id || (church_id.owner_user_id = @request.auth.id) || (@collection.church_memberships.church_id = church_id && @collection.church_memberships.user_id = @request.auth.id && @collection.church_memberships.role ?~ 'admin|pastor' && @collection.church_memberships.is_active = true))",
    "options": {}
  });

  return dao.saveCollection(collection);
}, (db) => {
  // Rollback - delete church_invitations collection
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("church_invitations");
  return dao.deleteCollection(collection);
});