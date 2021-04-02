export default interface WebSocketServerClosedEvent {

	readonly type: "closed";

	readonly error?: Error;

}
