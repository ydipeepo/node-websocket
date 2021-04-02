import http from "http";
import WebSocket from "./WebSocket";
import WebSocketEvent from "./WebSocketEvent";

export default interface WebSocketServerConnectedEvent {

	readonly type: "connected";

	readonly url: string;

	readonly headers: http.IncomingHttpHeaders;

	create(callback: (event: WebSocketEvent) => void): WebSocket;

}
