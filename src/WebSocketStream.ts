import { AsyncStream, ConcurrentQueue, Signal } from "@ydipeepo/node-async";

import WebSocket from "./WebSocket";
import WebSocketOptions from "./WebSocketOptions";
import WebSocketEvent from "./WebSocketEvent";

interface WebSocketStream extends AsyncStream<string | ArrayBuffer> {

	/**
	 * 接続先 URL。
	 */
    readonly endpointUrl: string;

	/**
	 * 指定したデータを送信します。
	 * @param data 送信するデータ。
	 */
	send(data: string | ArrayBuffer): void;

}

namespace WebSocketStream {

	/**
	 * 受信したデータのストリームとしてソケットオブジェクトを作成します。
	 * @param endpointUrl 接続先 URL。
	 * @param options ソケット作成オプション。
	 */
	export function create(endpointUrl: string, options?: WebSocketOptions): WebSocketStream {

		//
		// ソケットとそのイベントを仲介するキューを作成
		//

		const socketEventQueue = new ConcurrentQueue<WebSocketEvent>();
		const socket = WebSocket.create(endpointUrl, event => socketEventQueue.add(event), options);

		//
		// 接続を確立するまでの間、送信しようとしたデータは一時的なバッファに蓄える
		//

		let sendDataQueue: undefined | (string | ArrayBuffer)[];
		const send = (data: string | ArrayBuffer) => socket.send(data);
		const sendDeferred = (data: string | ArrayBuffer) => {
			sendDataQueue ??= [];
			sendDataQueue.push(data);
		};

		//
		// イベントキューからデータを受け取るストリームを作成
		//

		async function *createGenerator(): AsyncGenerator<string | ArrayBuffer, void, void> {

			const stopRequest = new Signal();

			try {
		
				//
				// イベントをポンプし `data_received` イベントだけ返すよう変形
				// その他のイベントはストリームに合わせてここで処理します
				//

			_PUMP:
				while (true) {
					const event = await socketEventQueue.get(stopRequest);
					switch (event.type) {
						case "data_received":
							yield event.data;
							break;
						case "opened":
							if (sendDataQueue !== undefined) {
								for (const data of sendDataQueue) {
									socket.send(data);
								}
								sendDataQueue = undefined;
							}
							stream.send = send;
							break;
						case "error":
							if (event.error !== undefined) throw event.error;
							break;
						case "closed":
							break _PUMP;
					}
				}
			} finally {
				stopRequest.trigger();
				socket.close();
			}
		
		}

		const stream: any = AsyncStream.from(createGenerator());
		stream.endpointUrl = endpointUrl;
		stream.send = sendDeferred;
		return stream;

	}

}

export default WebSocketStream;
