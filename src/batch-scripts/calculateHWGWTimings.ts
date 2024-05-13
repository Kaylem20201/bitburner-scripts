import { NS, Server } from "@ns";
import { HWGWTimings, HWGWThreads } from "batch-scripts/interfaces";
import { SCRIPT_GAP, BATCH_CALCULATIONS_PORT } from "/constantDefinitions";

export async function main(ns: NS): Promise<void> {
    const args = ns.args;
    const requestorPID = args[0];

    interface ReturnObject {
        requestorPID: number;
        fufilled: boolean;
        HWGWTimings: undefined | HWGWTimings;
    }

    if (typeof requestorPID !== 'number') return;
    const serverRaw = args[1];
    if (typeof serverRaw !== 'string') return;

    const returnObject: ReturnObject = {
        requestorPID,
        fufilled: false,
        HWGWTimings: undefined
    };

    const server: Server = JSON.parse(serverRaw);

    const threads = calculateHWGWTimings(ns, server);

    if (threads !== undefined) {
        returnObject.fufilled = true;
        returnObject.HWGWTimings = threads;
    }

    while (!ns.tryWritePort(BATCH_CALCULATIONS_PORT, returnObject)) ns.sleep(200);

}

function calculateHWGWTimings(ns: NS, nsServer: Server) {
    //Threads must finish in this order:
    //1. Hack 
    //2. Weaken
    //3. Grow
    //4. Weaken

    const player = ns.getPlayer();
    const hackDuration = ns.formulas.hacking.hackTime(nsServer, player);
    const weakenDuration = ns.formulas.hacking.weakenTime(nsServer, player);
    const growDuration = ns.formulas.hacking.growTime(nsServer, player);

    let hackFinishTime = 0;
    let weaken1FinishTime = hackFinishTime + SCRIPT_GAP;
    let growFinishTime = weaken1FinishTime + SCRIPT_GAP;
    let weaken2FinishTime = growFinishTime + SCRIPT_GAP;

    let hackStartTime = hackFinishTime - hackDuration;
    let weaken1StartTime = weaken1FinishTime - weakenDuration;
    let growStartTime = growFinishTime - growDuration;
    let weaken2StartTime = weaken2FinishTime - weakenDuration;

    const rawTimings = [hackStartTime, weaken1StartTime, growStartTime, weaken2StartTime];
    const firstTiming = Math.min(...rawTimings);
    const adjustedTimings = rawTimings.map((rawTiming) => rawTiming + firstTiming);
    [hackStartTime, weaken1StartTime, growStartTime, weaken2StartTime] = adjustedTimings;

    const totalDuration = weaken2StartTime + weakenDuration;

    const timingObject: HWGWTimings = {
        startTimes: [
            { time: hackStartTime, type: 'hack' },
            { time: weaken1StartTime, type: 'weaken' },
            { time: growStartTime, type: 'grow' },
            { time: weaken2StartTime, type: 'weaken' },
        ],
        totalDuration: totalDuration
    };

    return timingObject;

}
