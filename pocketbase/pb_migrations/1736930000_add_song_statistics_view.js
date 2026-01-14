/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
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
          COUNT(CASE WHEN r.rating = 'thumbs_up' THEN 1 END) as thumbs_up,
          COUNT(CASE WHEN r.rating = 'neutral' THEN 1 END) as neutral,
          COUNT(CASE WHEN r.rating = 'thumbs_down' THEN 1 END) as thumbs_down,
          COUNT(r.id) as total_ratings,
          COUNT(CASE WHEN r.is_difficult = 1 THEN 1 END) as difficult_count
        FROM songs s
        LEFT JOIN song_ratings r ON s.id = r.song_id
        GROUP BY s.id
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
  const collection = app.findCollectionByNameOrId('song_statistics');
  if (collection) {
    app.delete(collection);
  }
});
