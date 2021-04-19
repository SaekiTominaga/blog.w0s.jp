interface PortalHost {
	postMessage(message: any, options?: PostMessageOptions): undefined;

	onmessage: any;
	onmessageerror: any;
}

interface HTMLPortalElement extends HTMLElement {
	src: string;
	referrerPolicy: string;

	activate(options?: PortalActivateOptions): Promise<undefined>;
	postMessage(message: any, options?: PostMessageOptions): undefined;

	onmessage: any;
	onmessageerror: any;
}

declare var HTMLPortalElement: {
	prototype: HTMLPortalElement;
	new (): HTMLPortalElement;
};

interface PortalActivateOptions {
	data: any;
}

interface HTMLElementTagNameMap {
	portal: HTMLPortalElement;
}

interface Window
	extends EventTarget,
		AnimationFrameProvider,
		GlobalEventHandlers,
		WindowEventHandlers,
		WindowLocalStorage,
		WindowOrWorkerGlobalScope,
		WindowSessionStorage {
	readonly portalHost: PortalHost;
}
