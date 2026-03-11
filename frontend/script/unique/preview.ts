import type { VFileMessage } from 'vfile-message';

/**
 * Markdown 変換に際してのメッセージを表示
 *
 * @param template - Markdown 変換結果のメッセージを表示する要素
 * @param messages - メッセージ
 */
const setMessages = (template: HTMLTemplateElement, messages: readonly Readonly<VFileMessage>[]): void => {
	/* いったんクリア */
	Array.from(template.parentNode?.children ?? [])
		.filter((element) => element !== template)
		.forEach((element) => {
			element.remove();
		});

	const fragment = document.createDocumentFragment();
	messages.forEach((message) => {
		const clone = template.content.cloneNode(true) as HTMLElement;

		if (message.line !== undefined) {
			const line = clone.querySelector<HTMLElement>('.js-line');
			if (line !== null) {
				line.textContent = String(message.line);
			}
		}

		if (message.column !== undefined) {
			const column = clone.querySelector<HTMLElement>('.js-column');
			if (column !== null) {
				column.textContent = String(message.column);
			}
		}

		const reason = clone.querySelector<HTMLElement>('.js-reason');
		if (reason !== null) {
			reason.textContent = message.reason;
		}

		if (message.ruleId !== undefined) {
			const { ruleId } = message;

			const info = ruleId.startsWith('no-recommended-');
			const tr = clone.querySelector('tr');
			if (info) {
				if (tr !== null) {
					tr.dataset['level'] = 'info';
				}

				const icon = clone.querySelector<HTMLElement>('.js-icon-info');
				if (icon !== null) {
					icon.hidden = false;
				}
			} else {
				if (tr !== null) {
					tr.dataset['level'] = 'warning';
				}

				const icon = clone.querySelector<HTMLElement>('.js-icon-warning');
				if (icon !== null) {
					icon.hidden = false;
				}
			}

			const rule = clone.querySelector<HTMLAnchorElement>('.js-rule');
			if (rule !== null) {
				rule.textContent = ruleId;

				if (message.url !== undefined) {
					rule.href = message.url;
				}
			}
		}

		fragment.appendChild(clone);
	});
	template.parentNode?.appendChild(fragment);
};

/**
 * 本文のプレビューを実施
 *
 * @param template - 本文プレビューを表示する要素
 * @param html - 本文の HTML
 */
const setPreview = (template: HTMLTemplateElement, html: string): void => {
	/* いったんクリア */
	if (template.nextElementSibling !== null) {
		template.nextElementSibling.remove();
	}

	const fragment = document.createDocumentFragment();
	const clone = template.content.cloneNode(true) as HTMLElement;

	const previewElement = clone.querySelector('div');
	if (previewElement !== null) {
		previewElement.setHTMLUnsafe(html);
	}

	fragment.appendChild(clone);
	template.parentNode?.appendChild(fragment);
};

/**
 * 本文プレビュー
 *
 * @param element - HTML 要素
 */
const preview = async (
	element: Readonly<{
		ctrl: HTMLTextAreaElement; // 本文入力欄
		messages: HTMLTemplateElement; // Markdown 変換結果のメッセージを表示する要素
		preview: HTMLTemplateElement; // 本文プレビューを表示する要素
	}>,
) => {
	const { ctrl: ctrlElement, messages: messagesTemplate, preview: previewTemplate } = element;

	const response = await fetch('/api/preview', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			md: ctrlElement.value,
		}),
	});

	if (!response.ok) {
		setPreview(previewTemplate, `<strong><code>${response.url}</code> is ${String(response.status)} ${response.statusText}</strong>`);
		return;
	}

	const responseJson = (await response.json()) as {
		html: string;
		messages: VFileMessage[];
	};

	setMessages(messagesTemplate, responseJson.messages);
	setPreview(previewTemplate, responseJson.html);
};
export default preview;
