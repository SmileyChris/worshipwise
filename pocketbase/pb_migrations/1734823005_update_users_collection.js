/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // Add current_church_id field to users collection
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "user_current_church_id",
    "name": "current_church_id",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "church_collection_id",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("_pb_users_auth_")

  // Remove current_church_id field
  collection.schema.removeField("user_current_church_id")

  return dao.saveCollection(collection)
})