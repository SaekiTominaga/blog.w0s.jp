import { strict as assert } from 'node:assert';
import { afterEach, before, mock, test } from 'node:test';
import { JSDOM } from 'jsdom';
import entrySummary from './entrySummary.ts';

const originalFetch = global.fetch;

before(() => {
	const { window } = new JSDOM();

	global.document = window.document;
	global.HTMLInputElement = window.HTMLInputElement;
	global.HTMLTemplateElement = window.HTMLTemplateElement;

	// eslint-disable-next-line func-names
	window.HTMLElement.prototype.setHTMLUnsafe = function (str: string): void {
		this.innerHTML = str;
	};
});

afterEach(() => {
	global.fetch = originalFetch;
});

await test('validator', async (t) => {
	await t.test('element type', async () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<p></p>
`;

		await assert.rejects(entrySummary(document.querySelectorAll('p'), { load: true }), {
			name: 'Error',
			message: 'Element must be a `HTMLInputElement`',
		});
	});

	await t.test('no data-output attribute', async () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<input>
`;

		await assert.rejects(entrySummary(document.querySelectorAll('input'), { load: true }), {
			name: 'Error',
			message: 'The `data-output` attribute is not set',
		});
	});

	await t.test('no output element', async () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<input data-output="foo">
`;

		await assert.rejects(entrySummary(document.querySelectorAll('input'), { load: true }), {
			name: 'Error',
			message: 'Element `#foo` not found',
		});
	});

	await t.test('output element type', async () => {
		document.body.innerHTML = `
<!DOCTYPE html>
<input data-output="foo">
<p id="foo"></p>
`;

		await assert.rejects(entrySummary(document.querySelectorAll('input'), { load: true }), {
			name: 'Error',
			message: 'Element `#foo` must be a `HTMLTemplateElement`',
		});
	});
});

await test('empty value', async () => {
	document.body.innerHTML = `
<!DOCTYPE html>
<input value="" data-output="output">
<ul hidden>
	<template id="output">
		<li>
			<a class="js-anchor"></a>
			<span class="js-registed"></span>
		</li>
	</template>
</ul>
`;

	const $ctrls = document.querySelectorAll('input')!;

	await entrySummary($ctrls, { load: true });

	const $parent = document.querySelector('#output')?.parentElement;
	const $li = $parent?.querySelectorAll('li');

	assert.equal($parent?.hidden, true);
	assert.equal($li?.length, 0);
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

	document.body.innerHTML = `
<!DOCTYPE html>
<input value="1" data-output="output">
<ul hidden>
	<template id="output">
		<li></li>
	</template>
</ul>
`;

	const $ctrls = document.querySelectorAll('input')!;

	await entrySummary($ctrls, { load: true });

	const $parent = document.querySelector('#output')?.parentElement;
	const $li = $parent?.querySelectorAll('li');

	assert.equal($parent?.hidden, false);
	assert.equal($li?.length, 1);
	assert.equal($li.item(0).innerHTML, '<strong>404 Not Found: message</strong>');
});

await test('load event', async (t) => {
	before(() => {
		document.body.innerHTML = `
<!DOCTYPE html>
<input value="1,2" data-output="output">
<ul hidden>
	<template id="output">
		<li>
			<a class="js-anchor"></a>
			<span class="js-registed"></span>
		</li>
	</template>
</ul>
`;
	});

	await t.test('load: false', async () => {
		const $ctrls = document.querySelectorAll('input')!;

		await entrySummary($ctrls, { load: false });

		const $parent = document.querySelector('#output')?.parentElement;
		const $li = $parent?.querySelectorAll('li');

		assert.equal($parent?.hidden, true);
		assert.equal($li?.length, 0);
	});

	await t.test('single id', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ data: [{ id: 1 }] }),
				}),
			);
		});

		const $ctrls = document.querySelectorAll('input')!;

		await entrySummary($ctrls, { load: true });

		const $parent = document.querySelector('#output')?.parentElement;
		const $li = $parent?.querySelectorAll('li');

		assert.equal($parent?.hidden, false);
		assert.equal($li?.length, 1);
		assert.equal($li.item(0).innerHTML, '<strong>記事 ID 1 は存在しないか非公開</strong>');
	});

	await t.test('multi id', async () => {
		before(() => {
			// @ts-expect-error: ts(2322)
			global.fetch = mock.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ data: [{ id: 1 }, { id: 2, title: 'title', registed: '2001-02-03' }] }),
				}),
			);
		});

		const $ctrls = document.querySelectorAll('input')!;

		await entrySummary($ctrls, { load: true });

		const $parent = document.querySelector('#output')?.parentElement;
		const $li = $parent?.querySelectorAll('li');

		assert.equal($parent?.hidden, false);
		assert.equal($li?.length, 2);
		assert.equal($li.item(0).innerHTML, '<strong>記事 ID 1 は存在しないか非公開</strong>');
		assert.equal(
			$li.item(1).innerHTML.trim(),
			`<a class="js-anchor" href="/entry/2">title</a>
			<span class="js-registed">2001年2月3日</span>`,
		);
	});
});
