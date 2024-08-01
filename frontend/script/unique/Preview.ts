import type { VFileMessage } from 'vfile-message';

interface Option {
	ctrl: HTMLTextAreaElement;
	messages: HTMLTemplateElement;
	preview: HTMLTemplateElement;
}

/**
 * 本文プレビュー
 */
export default class Preview {
	readonly #ctrlElement: HTMLTextAreaElement; // 本文入力欄

	readonly #messagesElement: HTMLTemplateElement; // Markdown 変換結果のメッセージを表示する要素

	readonly #previewElement: HTMLTemplateElement; // 本文プレビューを表示する要素

	/**
	 * @param options - Option
	 */
	constructor(options: Option) {
		this.#ctrlElement = options.ctrl;
		this.#messagesElement = options.messages;
		this.#previewElement = options.preview;
	}

	/**
	 * 処理実行
	 */
	async exec(): Promise<void> {
		const formData = new FormData();
		formData.append('md', this.#ctrlElement.value);

		const response = await fetch('/api/preview', {
			method: 'POST',
			body: new URLSearchParams([...formData] as string[][]),
		});

		if (!response.ok) {
			this.#previewElement.textContent = `"${response.url}" is ${String(response.status)} ${response.statusText}`;
		}

		const responseJson = (await response.json()) as {
			html: string;
			messages: VFileMessage[];
		};

		this.#messages(responseJson.messages);
		this.#preview(responseJson.html);
	}

	/**
	 * MArkdown 変換に際してのメッセージを表示
	 *
	 * @param messages - メッセージ
	 */
	#messages(messages: VFileMessage[]) {
		/* いったんクリア */
		while (this.#messagesElement.nextElementSibling !== null) {
			this.#messagesElement.nextElementSibling.remove();
		}

		const fragment = document.createDocumentFragment();
		messages.forEach((message) => {
			const clone = this.#messagesElement.content.cloneNode(true) as HTMLElement;

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
		this.#messagesElement.parentNode?.appendChild(fragment);
	}

	/**
	 * 本文のプレビューを実施
	 *
	 * @param html - 本文の HTML
	 */
	#preview(html: string): void {
		/* いったんクリア */
		if (this.#previewElement.nextElementSibling !== null) {
			this.#previewElement.nextElementSibling.remove();
		}

		const fragment = document.createDocumentFragment();
		const clone = this.#previewElement.content.cloneNode(true) as HTMLElement;

		const previewElement = clone.querySelector('div');
		if (previewElement !== null) {
			previewElement.innerHTML = html;
		}

		fragment.appendChild(clone);
		this.#previewElement.parentNode?.appendChild(fragment);
	}
}
