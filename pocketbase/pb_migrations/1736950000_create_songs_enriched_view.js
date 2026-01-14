/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Drop if exists to ensure clean state
  try {
    const old = app.findCollectionByNameOrId('songs_enriched');
    if (old) {
      app.delete(old);
    }
  } catch (e) {
    // ignore
  }

  const collection = new Collection({
    name: 'songs_enriched',
    type: 'view',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    viewQuery: `
      SELECT
        s.id,
        s.church_id,
        s.title,
        s.artist,
        s.key_signature,
        s.tempo,
        s.duration_seconds,
        s.tags,
        s.labels,
        s.is_active,
        s.is_retired,
        s.created_by,
        (SELECT MAX(used_date) FROM song_usage WHERE song_id = s.id) as last_used_date,
        COALESCE((SELECT thumbs_up FROM song_statistics WHERE song_id = s.id), 0) as thumbs_up,
        COALESCE((SELECT thumbs_down FROM song_statistics WHERE song_id = s.id), 0) as thumbs_down,
        COALESCE((SELECT neutral FROM song_statistics WHERE song_id = s.id), 0) as neutral,
        COALESCE((SELECT total_ratings FROM song_statistics WHERE song_id = s.id), 0) as total_ratings,
        COALESCE((SELECT difficult_count FROM song_statistics WHERE song_id = s.id), 0) as difficult_count
      FROM songs s
    `,
    fields: [
      { type: "text", name: "id" },
      { type: "text", name: "church_id" },
      { type: "text", name: "title" },
      { type: "text", name: "artist" },
      { type: "text", name: "key_signature" },
      { type: "number", name: "tempo" },
      { type: "number", name: "duration_seconds" },
      { type: "json", name: "tags" },
      { type: "json", name: "labels" },
      { type: "bool", name: "is_active" },
      { type: "bool", name: "is_retired" },
      { type: "text", name: "created_by" },
      { type: "date", name: "last_used_date" },
      { type: "number", name: "thumbs_up" },
      { type: "number", name: "thumbs_down" },
      { type: "number", name: "neutral" },
      { type: "number", name: "total_ratings" },
      { type: "number", name: "difficult_count" }
    ]
  });

  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('songs_enriched');
    if (collection) {
      app.delete(collection);
    }
  } catch (e) {
    // ignore
  }
});
