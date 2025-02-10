export interface TargetServerTable {
    servers: TargetServer[];
}

export interface TargetServer {
    hostname: string;
    isCracked: boolean;
    isBackdoored: boolean | undefined;
    isPreparedForBatch: boolean;
    reqPorts: number;
    reqHackingLevel: number;
    maxMoney: number;
    // maxServerRam: number,
    // maxServerMoney: number | undefined,
    // batchMoneyPerMinute: number,
    // batchMoneyPerGBRam: number,
}
