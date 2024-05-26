import { NS } from "@ns";
import { Server } from "@ns";
import { BATCH_CALCULATIONS_PORT } from "/constantDefinitions";
import { HWGWThreads, HWGWTimings } from "batch-scripts/interfaces";

export async function calculateHWGWThreads(ns: NS, requestorPID: number, server: Server, hackPercent: number, cores: number): Promise<HWGWThreads | undefined> {
    ns.exec("batch-scripts/calculateHWGWThreads.js", "home", 1,
        requestorPID,
        JSON.stringify(server),
        hackPercent,
        cores);

    while (true) {
        await ns.nextPortWrite(BATCH_CALCULATIONS_PORT);
        let portData = ns.peek(BATCH_CALCULATIONS_PORT);
        if (requestorPID === portData.requestorPID) {
            ns.readPort(BATCH_CALCULATIONS_PORT);
            if (!portData.fufilled) return undefined;
            return portData.HWGWThreads;
        }
    }
}

export async function calculateHWGWTimings(ns: NS, requestorPID: number, server: Server): Promise<HWGWTimings | undefined> {
    ns.exec("batch-scripts/calculateHWGWTimings.js", "home", 1,
        requestorPID,
        JSON.stringify(server));

    while (true) {
        await ns.nextPortWrite(BATCH_CALCULATIONS_PORT);
        let portData = ns.peek(BATCH_CALCULATIONS_PORT);
        if (requestorPID === portData.requestorPID) {
            ns.readPort(BATCH_CALCULATIONS_PORT);
            if (!portData.fufilled) return undefined;
            return portData.HWGWTimings;
        }
    }
}
