import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import create from './newlyJson.js';

await test('create', async () => {
	const result = await create();

	assert.deepEqual(result.files, [
		'../frontend/public/json/newly.json',
		'../frontend/public/json/newly.json.br',
		'../frontend/public/json/newly_web.json',
		'../frontend/public/json/newly_web.json.br',
		'../frontend/public/json/newly_kumeta.json',
		'../frontend/public/json/newly_kumeta.json.br',
		'../frontend/public/json/newly_railway.json',
		'../frontend/public/json/newly_railway.json.br',
	]);
});
