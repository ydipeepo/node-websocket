export default interface WebSocket {

	readonly endpointUrl: string;

	/**
	 * 指定したデータを送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

	/**
	 * このソケットを閉じます。
	 */
	close(): void;

}
