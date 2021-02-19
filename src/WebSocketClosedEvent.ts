export default interface WebSocketClosedEvent {

	readonly type: "closed";

	readonly error?: Error;

}
