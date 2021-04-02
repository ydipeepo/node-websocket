import http from "http";
import { AsyncStream } from "@ydipeepo/node-async";

import WebSocketStream from "./WebSocketStream";

export default interface WebSocketStreamWithRequest extends WebSocketStream, AsyncStream<string | ArrayBuffer> {

	/**
	 * 要求 URL。
	 */
	readonly url: string;

	/**
	 * 要求ヘッダー。
	 */
	readonly headers: http.IncomingHttpHeaders;

}
