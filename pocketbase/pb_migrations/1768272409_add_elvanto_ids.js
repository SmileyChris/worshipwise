/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Add elvanto_id to services
  const services = app.findCollectionByNameOrId("services");
  
  services.fields.add(new Field({
    id: "elvanto_id",
    name: "elvanto_id",
    type: "text",
    required: false,
    presentable: false,
    unique: true,
    options: {
      min: null,
      max: 100,
      pattern: ""
    }
  }));
  
  app.save(services);

  // 2. Add elvanto_id to songs
  const songs = app.findCollectionByNameOrId("songs");
  
  songs.fields.add(new Field({
    id: "elvanto_id_song", // unique ID for the field definition
    name: "elvanto_id",
    type: "text",
    required: false,
    presentable: false,
    unique: true,
    options: {
      min: null,
      max: 100,
      pattern: ""
    }
  }));
  
  app.save(songs);

  // 3. Add last_elvanto_sync to churches
  const churches = app.findCollectionByNameOrId("churches");
  
  churches.fields.add(new Field({
    id: "last_elvanto_sync",
    name: "last_elvanto_sync",
    type: "date",
    required: false,
    presentable: false,
    unique: false,
    options: {
      min: "",
      max: ""
    }
  }));
  
  app.save(churches);

}, (app) => {
  // Down migration
  const services = app.findCollectionByNameOrId("services");
  services.fields.removeByName("elvanto_id");
  app.save(services);

  const songs = app.findCollectionByNameOrId("songs");
  songs.fields.removeByName("elvanto_id");
  app.save(songs);

  const churches = app.findCollectionByNameOrId("churches");
  churches.fields.removeByName("last_elvanto_sync");
  app.save(churches);
});
