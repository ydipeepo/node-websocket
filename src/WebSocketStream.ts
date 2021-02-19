import { AsyncStream } from "@ydipeepo/node-async";
import WebSocketEvent from "./WebSocketEvent";

export default interface WebSocketStream extends AsyncStream<string | ArrayBuffer> {

    readonly endpointUrl: string;

	/**
	 * 指定したデータを送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

}
