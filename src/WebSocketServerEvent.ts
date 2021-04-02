import WebSocketServerClosedEvent from "./WebSocketServerClosedEvent";
import WebSocketServerConnectedEvent from "./WebSocketServerConnectedEvent";
import WebSocketServerErrorEvent from "./WebSocketServerErrorEvent";
import WebSocketServerListeningEvent from "./WebSocketServerListeningEvent";

type WebSocketServerEvent =
	WebSocketServerClosedEvent |
	WebSocketServerConnectedEvent |
	WebSocketServerErrorEvent |
	WebSocketServerListeningEvent;

export default WebSocketServerEvent;
