/// <reference path="../pb_data/types.d.ts" />

/**
 * Helper to normalize XML arrays (single items come as objects, multiple as arrays)
 */
function toArray(val) {
	return val ? (Array.isArray(val) ? val : [val]) : [];
}

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
 * Returns record with _wasUpdate flag indicating if this was an update vs create
 */
function upsertRecord(collectionName, uniqueFilter, filterParams, data, app) {
	const collection = app.findCollectionByNameOrId(collectionName);
	let existing = null;

	// Try to find existing record
	try {
		existing = app.findFirstRecordByFilter(collectionName, uniqueFilter, filterParams);
	} catch (e) {
		// Not found - that's fine, we'll create
	}

	if (existing) {
		// Update existing record
		let isDirty = false;
		for (let key in data) {
			const newVal = data[key];
			// Use try/catch for get() in case field doesn't exist
			let currentVal;
			try {
				currentVal = existing.get(key);
			} catch (e) {
				currentVal = undefined;
			}
			// Compare as strings to handle type mismatches (dates, numbers, etc.)
			if (String(currentVal) !== String(newVal)) {
				existing.set(key, newVal);
				isDirty = true;
			}
		}
		if (isDirty) {
			app.save(existing);
		}
		existing._wasUpdate = true;
		return existing;
	} else {
		// Create new record
		const record = new Record(collection);
		for (let key in data) {
			record.set(key, data[key]);
		}
		app.save(record);
		record._wasUpdate = false;
		return record;
	}
}

module.exports = {
	toArray,
	elvantoFetch,
	upsertRecord
};
