import { strict as assert } from 'node:assert';
import { before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import messageTitle from './messageTitle.ts';

before(() => {
	global.document = new JSDOM().window.document;
});

await test('empty', async (t) => {
	const { document } = new JSDOM(`
<!DOCTYPE html>
<input id="title">
<textarea id="message"></textarea>
`).window;

	const title = document.querySelector<HTMLInputElement>('#title')!;
	const message = document.querySelector<HTMLTextAreaElement>('#message')!;

	await t.test('empty', () => {
		messageTitle({
			title: title,
			message: message,
		});

		assert.equal(title.value, '');
		assert.equal(message.value, '');
	});

	await t.test('no title', () => {
		message.value = 'text';

		messageTitle({
			title: title,
			message: message,
		});

		assert.equal(title.value, '');
		assert.equal(message.value, 'text');
	});

	await t.test('title for first line', () => {
		message.value = '# hdg\n\ntext';

		messageTitle({
			title: title,
			message: message,
		});

		assert.equal(title.value, 'hdg');
		assert.equal(message.value, 'text');
	});
});
