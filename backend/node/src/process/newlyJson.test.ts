import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import create from './newlyJson.js';

await test('create', async () => {
	const result = await create();

	assert.equal(result.files.length, 8);
	assert.equal(result.files.includes('../frontend/public/json/newly.json'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly.json.br'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_web.json'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_web.json.br'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_kumeta.json'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_kumeta.json.br'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_railway.json'), true);
	assert.equal(result.files.includes('../frontend/public/json/newly_railway.json.br'), true);
});
