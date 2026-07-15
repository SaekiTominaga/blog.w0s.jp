import { strict as assert } from 'node:assert';
import { afterEach, before, mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import preview from './preview.ts';

const originalFetch = global.fetch;

before(() => {
	const { window } = new JSDOM(`
<!DOCTYPE html>
<textarea></textarea>
<div hidden>
	<template id="markdown-messages">
		<tr>
			<td>
				<span class="js-info"></span>
				<span class="js-warning"></span>
			</td>
			<td><span class="js-line"></span>:<span class="js-column"></span></td>
			<td><span class="js-reason"></span></td>
			<td><a class="js-rule-id"></a></td>
		</tr>
	</template>
</div>
<div hidden>
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
				json: () => Promise.resolve({ error: { message: 'message' } }),
			}),
		);
	});

	const $ctrl = document.querySelector('textarea')!;
	const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
	const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

	await preview({
		ctrl: $ctrl,
		messages: $messagesTemplate,
		preview: $previewTemplate,
	});

	const $parent = $previewTemplate.parentElement;

	assert.equal($parent?.hidden, true);
	assert.equal($parent.querySelector(':scope > div')?.innerHTML, '<strong>404 Not Found: message</strong>');
});

await test('preview HTML', async (t) => {
	before(() => {
		// @ts-expect-error: ts(2322)
		global.fetch = mock.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ data: { html: '<p>text</p>', messages: [] } }),
			}),
		);
	});

	const $ctrl = document.querySelector('textarea')!;
	const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
	const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

	await preview({
		ctrl: $ctrl,
		messages: $messagesTemplate,
		preview: $previewTemplate,
	});

	await t.test('html', () => {
		assert.equal($previewTemplate.parentElement?.querySelector(':scope > div')?.innerHTML, '<p>text</p>');
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
							data: {
								html: '<p>text</p>',
								messages: [
									{
										line: 1,
										column: 2,
										ruleId: 'no-recommended-foo',
										reason: 'Reason',
									},
								],
							},
						}),
				}),
			);
		});

		const $ctrl = document.querySelector('textarea')!;
		const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: $ctrl,
			messages: $messagesTemplate,
			preview: $previewTemplate,
		});

		const parent = $messagesTemplate.parentElement!;

		assert.equal(parent.querySelectorAll('tr').length, 1);
		assert.equal(parent.querySelector<HTMLElement>('.js-info')?.hidden, false);
		assert.equal(parent.querySelector<HTMLElement>('.js-warning')?.hidden, true);
		assert.equal(parent.querySelector('.js-line')?.textContent, '1');
		assert.equal(parent.querySelector('.js-column')?.textContent, '2');
		assert.equal(parent.querySelector('.js-reason')?.textContent, 'Reason');
		assert.equal(parent.querySelector('.js-rule-id')?.getAttribute('href'), null);
		assert.equal(parent.querySelector('.js-rule-id')?.textContent, 'no-recommended-foo');
	});

	await t.test('warning', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							data: {
								html: '<p>text</p>',
								messages: [
									{
										line: 1,
										column: 2,
										ruleId: 'no-foo',
										reason: 'Reason',
									},
								],
							},
						}),
				}),
			);
		});

		const $ctrl = document.querySelector('textarea')!;
		const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: $ctrl,
			messages: $messagesTemplate,
			preview: $previewTemplate,
		});

		const parent = $messagesTemplate.parentElement!;

		assert.equal(parent.querySelectorAll('tr').length, 1);
		assert.equal(parent.querySelector<HTMLElement>('.js-info')?.hidden, true);
		assert.equal(parent.querySelector<HTMLElement>('.js-warning')?.hidden, false);
		assert.equal(parent.querySelector('.js-line')?.textContent, '1');
		assert.equal(parent.querySelector('.js-column')?.textContent, '2');
		assert.equal(parent.querySelector('.js-reason')?.textContent, 'Reason');
		assert.equal(parent.querySelector('.js-rule-id')?.getAttribute('href'), null);
		assert.equal(parent.querySelector('.js-rule-id')?.textContent, 'no-foo');
	});

	await t.test('URL', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							data: {
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
							},
						}),
				}),
			);
		});

		const $ctrl = document.querySelector('textarea')!;
		const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: $ctrl,
			messages: $messagesTemplate,
			preview: $previewTemplate,
		});

		const parent = $messagesTemplate.parentElement!;

		assert.equal(parent.querySelector('.js-rule-id')?.getAttribute('href'), 'http://example.com/');
	});

	await t.test('sort', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							data: {
								html: '<p>text</p>',
								messages: [
									{
										line: 2,
										column: 1,
										reason: 'Reason1',
									},
									{
										reason: 'Reason2',
									},
									{
										reason: 'Reason3',
									},
									{
										line: 1,
										column: 2,
										reason: 'Reason4',
									},
								],
							},
						}),
				}),
			);
		});

		const $ctrl = document.querySelector('textarea')!;
		const $messagesTemplate = document.querySelector<HTMLTemplateElement>('#markdown-messages')!;
		const $previewTemplate = document.querySelector<HTMLTemplateElement>('#message-preview')!;

		await preview({
			ctrl: $ctrl,
			messages: $messagesTemplate,
			preview: $previewTemplate,
		});

		const parent = $messagesTemplate.parentElement!;

		const trs = parent.querySelectorAll('tr');

		assert.equal(trs.length, 4);
		assert.equal(trs[0]?.querySelectorAll('td')[1]?.textContent, '1:2');
		assert.equal(trs[0].querySelectorAll('td')[2]?.textContent, 'Reason4');
		assert.equal(trs[1]?.querySelectorAll('td')[1]?.textContent, '2:1');
		assert.equal(trs[1].querySelectorAll('td')[2]?.textContent, 'Reason1');
		assert.equal(trs[2]?.querySelectorAll('td')[1]?.textContent, ':');
		assert.equal(trs[2].querySelectorAll('td')[2]?.textContent, 'Reason2');
		assert.equal(trs[3]?.querySelectorAll('td')[1]?.textContent, ':');
		assert.equal(trs[3].querySelectorAll('td')[2]?.textContent, 'Reason3');
	});
});
