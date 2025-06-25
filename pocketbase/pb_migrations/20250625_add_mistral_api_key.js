/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("churches");
  
  // add mistral_api_key field
  const field = new Field({
    id: "mistral_api_key",
    name: "mistral_api_key",
    type: "text",
    required: false,
    presentable: false,
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
  
  // remove mistral_api_key field
  collection.fields.removeById("mistral_api_key");

  return app.save(collection);
});