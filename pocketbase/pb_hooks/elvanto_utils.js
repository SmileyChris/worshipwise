/// <reference path="../pb_data/types.d.ts" />

/**
 * Helper to fetch from Elvanto
 */
function elvantoFetch(endpoint, apiKey, data) {
	const res = $http.send({
		url: 'https://api.elvanto.com/v1/' + endpoint + '.json',
		method: 'POST',
		headers: {
			Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data || {})
	});

	if (res.statusCode != 200) {
		throw new Error('Elvanto API Error: ' + res.statusCode + ' ' + res.raw);
	}
	const json = res.json;
	if (json.status != 'ok') {
		throw new Error('Elvanto API Error: ' + (json.error ? json.error.message : 'Unknown'));
	}
	return json;
}

/**
 * Helper to upsert a record
 * Returns the record object
 */
function upsertRecord(collectionName, uniqueFilter, filterParams, data, app) {
	const collection = app.findCollectionByNameOrId(collectionName);
	try {
		const existing = app.findFirstRecordByFilter(collectionName, uniqueFilter, filterParams);
		// Update
		for (let key in data) {
			existing.set(key, data[key]);
		}
		app.save(existing);
		return existing;
	} catch (e) {
		// Not found, Create
		const record = new Record(collection);
		for (let key in data) {
			record.set(key, data[key]);
		}
		app.save(record);
		return record;
	}
}

module.exports = {
	elvantoFetch,
	upsertRecord
};
