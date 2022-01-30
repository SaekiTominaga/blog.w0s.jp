import ButtonConfirm from '@saekitominaga/customelements-button-confirm';

if (document.querySelector('button[is="w0s-confirm-button"]') !== null) {
	/* ボタン押下時に確認メッセージを表示 */
	customElements.define('w0s-confirm-button', ButtonConfirm, {
		extends: 'button',
	});
}
