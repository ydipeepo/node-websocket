export default interface WebSocketDataReceivedEvent {

	readonly type: "data_received";

	readonly data: string | ArrayBuffer;

}
