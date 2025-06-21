migrate((db) => {
  // Create churches collection
  const collection = new Collection({
    "name": "churches",
    "type": "base",
    "system": false,
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {
          "max": 200
        }
      },
      {
        "name": "slug",
        "type": "text",
        "required": true,
        "options": {
          "max": 100
        }
      },
      {
        "name": "timezone",
        "type": "text",
        "required": true,
        "options": {
          "max": 100
        }
      },
      {
        "name": "hemisphere", 
        "type": "select",
        "required": true,
        "options": {
          "values": ["northern", "southern"]
        }
      },
      {
        "name": "subscription_type",
        "type": "select", 
        "required": true,
        "options": {
          "values": ["free", "basic", "premium"]
        }
      },
      {
        "name": "subscription_status",
        "type": "select",
        "required": true, 
        "options": {
          "values": ["active", "trial", "suspended", "cancelled"]
        }
      },
      {
        "name": "max_users",
        "type": "number",
        "required": true
      },
      {
        "name": "max_songs", 
        "type": "number",
        "required": true
      },
      {
        "name": "max_storage_mb",
        "type": "number", 
        "required": true
      },
      {
        "name": "settings",
        "type": "json",
        "required": true
      },
      {
        "name": "owner_user_id",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "_pb_users_auth_",
          "maxSelect": 1
        }
      },
      {
        "name": "billing_email",
        "type": "email", 
        "required": false
      },
      {
        "name": "is_active",
        "type": "bool",
        "required": true
      }
    ]
  });

  return Dao(db).saveCollection(collection);
});