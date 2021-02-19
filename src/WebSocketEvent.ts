import WebSocketOpenedEvent from "./WebSocketOpenedEvent";
import WebSocketClosedEvent from "./WebSocketClosedEvent";
import WebSocketDataReceivedEvent from "./WebSocketDataReceivedEvent";
import WebSocketErrorEvent from "./WebSocketErrorEvent";

type WebSocketEvent =
	WebSocketOpenedEvent |
	WebSocketClosedEvent |
	WebSocketDataReceivedEvent |
	WebSocketErrorEvent;

export default WebSocketEvent;
