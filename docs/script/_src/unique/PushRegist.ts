import firebase from 'firebase';

interface DiaryPushRegistJson {
	success: DiaryPushRegistJsonSuccess;
	error: DiaryPushRegistJsonError;
}
interface DiaryPushRegistJsonSuccess {
	count: number;
}
interface DiaryPushRegistJsonError {
	code: number;
}

/**
 * 日記のプッシュ通知登録
 */
export default class {
	#endPoint: string; // エンドポイント
	#vapidKey: string; // Firebase Cloud Messaging の鍵ペア

	#STORAGE_JSACTION_KEY = 'jsaction'; // JS による処理が実行される時にストレージに書き込むキー
	#STORAGE_JSACTION_REGISTER_VALUE = 'register'; // 登録処理が実行される時にストレージに書き込む値
	#STORAGE_JSACTION_UNREGISTER_VALUE = 'unregister'; // 登録解除処理が実行される時にストレージに書き込む値

	#registerButtonElement: HTMLButtonElement; // 登録ボタン
	#unregisterButtonElement: HTMLButtonElement; // 登録解除ボタン

	#messageRegisterSuccessElement: HTMLElement; // 登録が正常に完了したときに表示するメッセージ
	#messageUnregisterSuccessElement: HTMLElement; // 登録解除が正常に完了したときに表示するメッセージ

	#messageCookieDisabledElement: HTMLElement; // Cookie 無効時に表示するメッセージ
	//#messagePushNosupportElement: HTMLElement; // プッシュ通知非対応環境に表示するメッセージ
	#messageErrorElement: HTMLElement; // 汎用エラー

	#messageTokenExistElement: HTMLElement; // すでに登録されている時のメッセージ
	#messageTokenNothingElement: HTMLElement; // トークンが存在しない時のメッセージ
	#messagePermissionNograntedElement: HTMLElement; // 通知許可が得られなかった時のメッセージ

	#registButtonClickEventListener: () => void;
	#unregistButtonClickEventListener: () => void;

	/**
	 * @param {string} endPoint - エンドポイントの URL
	 * @param {string} vapidKey - Firebase Cloud Messaging の鍵ペア
	 */
	constructor(endPoint: string, vapidKey: string) {
		this.#endPoint = endPoint;
		this.#vapidKey = vapidKey;

		this.#registerButtonElement = <HTMLButtonElement>document.getElementById('js-push-regist-button'); // 登録ボタン
		this.#unregisterButtonElement = <HTMLButtonElement>document.getElementById('js-push-unregist-button'); // 登録解除ボタン

		this.#messageRegisterSuccessElement = <HTMLElement>document.getElementById('js-message-regist-success'); // 登録が正常に完了したときに表示するメッセージ
		this.#messageUnregisterSuccessElement = <HTMLElement>document.getElementById('js-message-unregist-success'); // 登録解除が正常に完了したときに表示するメッセージ

		//this.#messagePushNosupportElement = <HTMLElement>document.getElementById('js-push-nosupport'); // プッシュ通知非対応環境に表示するメッセージ
		this.#messageCookieDisabledElement = <HTMLElement>document.getElementById('js-cookie-disabled'); // Cookie 無効時に表示するメッセージ
		this.#messageErrorElement = <HTMLElement>document.getElementById('js-message-error'); // 汎用エラー
		this.#messageTokenExistElement = <HTMLElement>document.getElementById('js-message-token-exist'); // すでに登録されている時のメッセージ
		this.#messageTokenNothingElement = <HTMLElement>document.getElementById('js-message-token-nothing'); // トークンが存在しない時のメッセージ
		this.#messagePermissionNograntedElement = <HTMLElement>document.getElementById('js-message-permission-nogranted'); // 通知許可が得られなかった時のメッセージ

		this.#registButtonClickEventListener = this._registButtonClickEvent.bind(this);
		this.#unregistButtonClickEventListener = this._unregistButtonClickEvent.bind(this);
	}

	/**
	 * 初期化処理
	 */
	init(): void {
		/* Cookie 無効時 */
		if (!navigator.cookieEnabled) {
			this._cookieDisabled();
			return;
		}

		/* 登録処理 */
		const jsActionType = sessionStorage.getItem(this.#STORAGE_JSACTION_KEY);
		sessionStorage.removeItem(this.#STORAGE_JSACTION_KEY);

		try {
			switch (jsActionType) {
				case this.#STORAGE_JSACTION_REGISTER_VALUE: {
					this._register();
					break;
				}
				case this.#STORAGE_JSACTION_UNREGISTER_VALUE: {
					this._unregister();
					break;
				}
			}
		} catch (e) {
			console.info(e);
			this.#messageErrorElement.hidden = false;
		}

		this.#registerButtonElement.addEventListener('click', this.#registButtonClickEventListener, { passive: true });
		this.#unregisterButtonElement.addEventListener('click', this.#unregistButtonClickEventListener, { passive: true });
	}

	/**
	 * Cookie 無効時の処理
	 */
	private _cookieDisabled(): void {
		this.#messageCookieDisabledElement.hidden = false;
		this.#registerButtonElement.disabled = true;
		this.#unregisterButtonElement.disabled = true;
	}

	/**
	 * 登録ボタンを押したときの処理
	 */
	private async _registButtonClickEvent(): Promise<void> {
		if ((await Notification.requestPermission()) !== 'granted') {
			this.#messagePermissionNograntedElement.hidden = false;
			return;
		}

		sessionStorage.setItem(this.#STORAGE_JSACTION_KEY, this.#STORAGE_JSACTION_REGISTER_VALUE);

		location.reload();
	}

	/**
	 * 登録解除ボタンを押したときの処理
	 */
	private async _unregistButtonClickEvent(): Promise<void> {
		if ((await Notification.requestPermission()) !== 'granted') {
			this.#messagePermissionNograntedElement.hidden = false;
			return;
		}

		sessionStorage.setItem(this.#STORAGE_JSACTION_KEY, this.#STORAGE_JSACTION_UNREGISTER_VALUE);

		location.reload();
	}

	/**
	 * 登録処理
	 */
	private async _register(): Promise<void> {
		const token = await this._getToken();
		console.info(`Firebase Token: ${token}`);

		/* トークンをDBに登録する */
		const formData = new FormData();
		formData.append('actionadd', '1');
		formData.append('token', token);

		const response = await fetch(this.#endPoint, {
			method: 'POST',
			headers: {
				'X-Requested-With': 'fetch',
			},
			body: new URLSearchParams(<string[][]>[...formData]),
		});
		if (!response.ok) {
			throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
		}

		const dataList: DiaryPushRegistJson = await response.json();

		if (dataList.error === undefined) {
			/* 正常に完了した場合 */
			this.#registerButtonElement.disabled = true;
			this.#messageRegisterSuccessElement.hidden = false;
		} else {
			switch (dataList.error.code) {
				case 23000: {
					/* トークンが登録済みの場合（23000: SQLite ユニーク制約） */
					this.#registerButtonElement.disabled = true;
					this.#messageTokenExistElement.hidden = false;
					break;
				}
				default:
					throw new Error(String(dataList.error.code));
			}
		}
	}

	/**
	 * 登録解除処理
	 */
	private async _unregister(): Promise<void> {
		const token = await this._getToken();
		console.info(`Firebase Token: ${token}`);

		/* トークンをDBから削除する */
		const formData = new FormData();
		formData.append('actiondel', '1');
		formData.append('token', token);

		const response = await fetch(this.#endPoint, {
			method: 'POST',
			headers: {
				'X-Requested-With': 'fetch',
			},
			body: new URLSearchParams(<string[][]>[...formData]),
		});
		if (!response.ok) {
			throw new Error(`"${response.url}" is ${response.status} ${response.statusText}`);
		}

		const dataList: DiaryPushRegistJson = await response.json();

		if (dataList.error === undefined) {
			/* 正常に完了した場合 */
			switch (dataList.success.count) {
				case 1: {
					this.#unregisterButtonElement.disabled = true;
					this.#messageUnregisterSuccessElement.hidden = false;
					break;
				}
				case 0: {
					this.#unregisterButtonElement.disabled = true;
					this.#messageTokenNothingElement.hidden = false;
					break;
				}
				default: {
					throw new Error(String(dataList.success.count));
				}
			}
		} else {
			throw new Error(String(dataList.error.code));
		}
	}

	/**
	 * Firebase のトークンを取得する
	 *
	 * @returns {string} トークン
	 */
	private async _getToken(): Promise<string> {
		return await firebase.messaging().getToken({ vapidKey: this.#vapidKey });
	}
}
