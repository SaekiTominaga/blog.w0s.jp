import { strict as assert } from 'node:assert';
import { before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import searchEngine from './searchEngine.ts';

before(() => {
	const { window } = new JSDOM();

	global.document = window.document;
	global.HTMLSelectElement = window.HTMLSelectElement;
});

await test('validator', async (t) => {
	await t.test('element type', () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<p></p>
`;

		assert.throws(
			() => {
				searchEngine(document.querySelector('p'));
			},
			{
				name: 'TypeError',
				message: 'Element must be a `HTMLSelectElement`',
			},
		);
	});

	await t.test('element type', () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<select></select>
`;

		assert.throws(
			() => {
				searchEngine(document.querySelector('select'));
			},
			{
				name: 'TypeError',
				message: 'The `data-storage-key` attribute is not set',
			},
		);
	});
});
