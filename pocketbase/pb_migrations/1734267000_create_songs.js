/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = {
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "fields": [
      {
        "hidden": false,
        "id": "title",
        "max": 200,
        "min": 1,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "artist",
        "max": 100,
        "min": 0,
        "name": "artist",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "key_signature",
        "max": 1,
        "name": "key_signature",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
          "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"
        ]
      },
      {
        "hidden": false,
        "id": "tempo",
        "max": 200,
        "min": 60,
        "name": "tempo",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "duration_seconds",
        "max": 1800,
        "min": 30,
        "name": "duration_seconds",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "tags",
        "name": "tags",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "lyrics",
        "name": "lyrics",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "editor"
      },
      {
        "hidden": false,
        "id": "chord_chart",
        "max": 1,
        "maxSize": 10485760,
        "mimeTypes": ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
        "name": "chord_chart",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "audio_file",
        "max": 1,
        "maxSize": 52428800,
        "mimeTypes": ["audio/mpeg", "audio/wav", "audio/mp3", "audio/m4a"],
        "name": "audio_file",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "sheet_music",
        "max": 3,
        "maxSize": 10485760,
        "mimeTypes": ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
        "name": "sheet_music",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "ccli_number",
        "max": 20,
        "min": 0,
        "name": "ccli_number",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "copyright_info",
        "max": 500,
        "min": 0,
        "name": "copyright_info",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "notes",
        "name": "notes",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "editor"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "created_by",
        "max": 1,
        "min": 0,
        "name": "created_by",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "is_active",
        "name": "is_active",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "songs_collection",
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "name": "songs",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }

  return app.save(new Collection(collection))
}, (app) => {
  const collection = app.findCollectionByNameOrId("songs")
  return app.delete(collection)
})