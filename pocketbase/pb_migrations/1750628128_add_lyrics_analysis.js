/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("songs")

  // add new JSON field using modern v0.28+ syntax
  collection.fields.push(new JSONField({
    name: "lyrics_analysis",
    required: false
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("songs")

  // remove the lyrics_analysis field
  collection.fields = collection.fields.filter(field => field.name !== "lyrics_analysis")

  return app.save(collection)
})
