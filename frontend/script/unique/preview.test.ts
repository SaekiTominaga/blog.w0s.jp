import { strict as assert } from 'node:assert';
import { afterEach, before, mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import preview from './preview.ts';

const originalFetch = global.fetch;

before(() => {
	const { window } = new JSDOM(`
<!DOCTYPE html>
<textarea></textarea>
<div>
	<template id="markdown-messages">
		<tr>
			<td>
				<span class="js-icon-info" hidden=""></span>
				<span class="js-icon-warning" hidden=""></span>
			</td>
			<td><span class="js-line"></span>:<span class="js-column"></span></td>
			<td><span class="js-reason"></span></td>
			<td><a class="js-rule"></a></td>
		</tr>
	</template>
</div>
<div>
	<template id="message-preview">
		<div></div>
	</template>
</div>
`);

	global.document = window.document;

	// eslint-disable-next-line func-names
	window.HTMLElement.prototype.setHTMLUnsafe = function (str: string): void {
		this.innerHTML = str;
	};
});

afterEach(() => {
	global.fetch = originalFetch;
});

await test('fetch error', async () => {
	before(() => {
		// @ts-expect-error: ts(2322)
		global.fetch = mock.fn(() =>
			Promise.resolve({
				ok: false,
				url: 'http://example.com/sample',
				status: 404,
				statusText: 'Not Found',
			}),
		);
	});

	const ctrlElement = document.querySelector('textarea')!;
	const messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
	const previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

	await preview({
		ctrl: ctrlElement,
		messages: messagesTemplate,
		preview: previewTemplate,
	});

	const parent = previewTemplate.parentElement!;

	assert.equal(parent.querySelector(':scope > div')?.innerHTML, '<strong><code>http://example.com/sample</code> is 404 Not Found</strong>');
});

await test('preview HTML', async (t) => {
	before(() => {
		// @ts-expect-error: ts(2322)
		global.fetch = mock.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ html: '<p>text</p>', messages: [] }),
			}),
		);
	});

	const ctrlElement = document.querySelector('textarea')!;
	const messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
	const previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

	await preview({
		ctrl: ctrlElement,
		messages: messagesTemplate,
		preview: previewTemplate,
	});

	await t.test('html', () => {
		assert.equal(previewTemplate.parentElement?.querySelector(':scope > div')?.innerHTML, '<p>text</p>');
	});
});

await test('messages', async (t) => {
	await t.test('info', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							html: '<p>text</p>',
							messages: [
								{
									line: 1,
									column: 2,
									ruleId: 'no-recommended-foo',
									reason: 'Reason',
								},
							],
						}),
				}),
			);
		});

		const ctrlElement = document.querySelector('textarea')!;
		const messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: ctrlElement,
			messages: messagesTemplate,
			preview: previewTemplate,
		});

		const parent = messagesTemplate.parentElement!;

		assert.equal(parent.querySelector('tr')?.dataset['level'], 'info');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-icon-info')?.hidden, false);
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-icon-warning')?.hidden, true);
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-line')?.textContent, '1');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-column')?.textContent, '2');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-reason')?.textContent, 'Reason');
		assert.equal(parent.querySelector<HTMLAnchorElement>('.js-rule')?.textContent, 'no-recommended-foo');
		assert.equal(parent.querySelector<HTMLAnchorElement>('.js-rule')?.href, '');
	});

	await t.test('warning & URL', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							html: '<p>text</p>',
							messages: [
								{
									line: 1,
									column: 2,
									ruleId: 'no-foo',
									reason: 'Reason',
									url: 'http://example.com/',
								},
							],
						}),
				}),
			);
		});

		const ctrlElement = document.querySelector('textarea')!;
		const messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: ctrlElement,
			messages: messagesTemplate,
			preview: previewTemplate,
		});

		const parent = messagesTemplate.parentElement!;

		assert.equal(parent.querySelector('tr')?.dataset['level'], 'warning');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-icon-info')?.hidden, true);
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-icon-warning')?.hidden, false);
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-line')?.textContent, '1');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-column')?.textContent, '2');
		assert.equal(parent.querySelector<HTMLSpanElement>('.js-reason')?.textContent, 'Reason');
		assert.equal(parent.querySelector<HTMLAnchorElement>('.js-rule')?.textContent, 'no-foo');
		assert.equal(parent.querySelector<HTMLAnchorElement>('.js-rule')?.href, 'http://example.com/');
	});
});
