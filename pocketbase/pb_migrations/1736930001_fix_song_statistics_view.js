/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Drop if exists to ensure clean state
  try {
    const old = app.findCollectionByNameOrId('song_statistics');
    if (old) {
      app.delete(old);
    }
  } catch (e) {
    // ignore
  }

  const collection = new Collection({
    name: 'song_statistics',
    type: 'view',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    viewQuery: `
        SELECT
          s.id as id,
          s.id as song_id,
          s.church_id as church_id,
          COUNT(CASE WHEN r.rating = 'thumbs_up' THEN 1 ELSE NULL END) as thumbs_up,
          COUNT(CASE WHEN r.rating = 'neutral' THEN 1 ELSE NULL END) as neutral,
          COUNT(CASE WHEN r.rating = 'thumbs_down' THEN 1 ELSE NULL END) as thumbs_down,
          COUNT(r.id) as total_ratings,
          COUNT(CASE WHEN r.is_difficult = 1 THEN 1 ELSE NULL END) as difficult_count
        FROM songs s
        LEFT JOIN song_ratings r ON s.id = r.song_id
        GROUP BY s.id, s.church_id
      `,
    fields: [
      { type: "text", name: "id" },
      { type: "text", name: "song_id" },
      { type: "text", name: "church_id" },
      { type: "number", name: "thumbs_up" },
      { type: "number", name: "neutral" },
      { type: "number", name: "thumbs_down" },
      { type: "number", name: "total_ratings" },
      { type: "number", name: "difficult_count" }
    ]
  });

  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('song_statistics');
    if (collection) {
      app.delete(collection);
    }
  } catch (e) {
    // ignore
  }
});
