/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("churches");

  // add elvanto_api_key field
  const field = new Field({
    id: "elvanto_api_key",
    name: "elvanto_api_key",
    type: "text",
    required: false,
    presentable: false, // Security: Hidden by default
    unique: false,
    options: {
      min: null,
      max: 200,
      pattern: ""
    }
  });

  collection.fields.add(field);

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("churches");

  // remove elvanto_api_key field
  collection.fields.removeById("elvanto_api_key");

  return app.save(collection);
});
