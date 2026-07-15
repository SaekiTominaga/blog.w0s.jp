import type { VFileMessage } from 'vfile-message';
import type { Preview as ApiResponsePreview } from '../../../@types/api.d.ts';

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

	/* 行番号でソート */
	const sortedMessages = messages.toSorted((a, b) => {
		if (a.line === undefined && b.line === undefined) {
			return 0;
		}
		if (a.line === undefined) {
			return 1;
		}
		if (b.line === undefined) {
			return -1;
		}
		return a.line - b.line;
	});

	const fragment = document.createDocumentFragment();
	sortedMessages.forEach((message) => {
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

		const { ruleId } = message;

		const info = ruleId?.startsWith('no-recommended-') ?? false;

		const infoIcon = clone.querySelector<HTMLElement>('.js-info');
		if (infoIcon !== null) {
			infoIcon.hidden = !info;
		}

		const warningIcon = clone.querySelector<HTMLElement>('.js-warning');
		if (warningIcon !== null) {
			warningIcon.hidden = info;
		}

		const rule = clone.querySelector<HTMLAnchorElement>('.js-rule-id');
		if (rule !== null) {
			if (ruleId !== undefined) {
				rule.textContent = ruleId;
			}

			if (message.url !== undefined) {
				rule.href = message.url;
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
	template.nextElementSibling?.remove();

	const fragment = document.createDocumentFragment();
	const clone = template.content.cloneNode(true) as HTMLElement;

	const $preview = clone.querySelector('div');
	$preview?.setHTMLUnsafe(html);

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
): Promise<void> => {
	const { ctrl: $ctrl, messages: $messagesTemplate, preview: $previewTemplate } = element;

	const response = await fetch('/api/preview', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			md: $ctrl.value,
		}),
	});

	const responseJson = (await response.json()) as ApiResponsePreview;

	if ('error' in responseJson) {
		setPreview($previewTemplate, `<strong>${String(response.status)} ${response.statusText}: ${responseJson.error.message}</strong>`);
	}
	if ('data' in responseJson) {
		setMessages($messagesTemplate, responseJson.data.messages);
		setPreview($previewTemplate, responseJson.data.html);
	}
};
export default preview;
