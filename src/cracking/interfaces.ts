export interface TargetServerTable {
	[targetHostname: string]: TargetServer
};

export interface TargetServer {
	hostname: string,
	isCracked: boolean,
	isBackdoored: boolean | undefined,
	isPreparedForBatch: boolean,
	// maxServerRam: number,
	// maxServerMoney: number | undefined,
	// batchMoneyPerMinute: number,
	// batchMoneyPerGBRam: number,
}
