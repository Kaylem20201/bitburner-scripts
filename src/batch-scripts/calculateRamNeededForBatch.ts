import { HWGWThreads, HWGWTimings } from "./interfaces";
import { NS } from "/../NetscriptDefinitions";
import { BATCH_CALCULATIONS_PORT, GROW_SCRIPT, HACK_SCRIPT, SCRIPT_GAP, WEAKEN_SCRIPT } from "/constantDefinitions";

export async function main(ns: NS) {
    const args = ns.args;
    const requestorPID = args[0];

    interface ReturnObject {
        requestorPID: number;
        fufilled: boolean;
        maxRamNeeded?: number;
    }

    if (typeof requestorPID !== 'number') return;
    const threadsRaw = args[1];
    if (typeof threadsRaw !== 'string') return;
    const timingsRaw = args[2];
    if (typeof timingsRaw !== 'string') return;

    const returnObject: ReturnObject = {
        requestorPID,
        fufilled: false
    };

    const hwgwThreads: HWGWThreads = JSON.parse(threadsRaw);
    const hwgwTimings: HWGWTimings = JSON.parse(timingsRaw);

    const ram = calculateRamNeededForBatch(ns, hwgwThreads, hwgwTimings);

    if (ram !== undefined) {
        returnObject.fufilled = true;
        returnObject.maxRamNeeded = ram;
    }

    while (!ns.tryWritePort(BATCH_CALCULATIONS_PORT, returnObject)) ns.sleep(200);

}

export function calculateRamNeededForBatch(ns: NS, threads: HWGWThreads, timings: HWGWTimings) {
    //First calculate how much ram is used for a single set
    //Then, multiply that by how many sets will be started before the first set finishes
    //This is an estimate, but its a HIGH estimate, so it should at least be safe for now
    //TODO: More accurate RAM calculation

    const [hackThreads, weaken1Threads, growThreads, weaken2Threads] = [
        threads.hackThreads,
        threads.weakenCounteringHackThreads,
        threads.growThreads,
        threads.growThreads
    ];
    const hackRam = hackThreads * ns.getScriptRam(HACK_SCRIPT);
    const weaken1Ram = weaken1Threads * ns.getScriptRam(WEAKEN_SCRIPT);
    const growRam = growThreads * ns.getScriptRam(GROW_SCRIPT);
    const weaken2Ram = weaken2Threads * ns.getScriptRam(WEAKEN_SCRIPT);
    const singleSetRam = hackRam + weaken1Ram + growRam + weaken2Ram;

    const duration = timings.totalDuration;
    const startTimes = timings.startTimes.map((timingObject) => timingObject.time);
    const lastStartTime = Math.max(...startTimes);
    const numSets = Math.ceil(duration / (lastStartTime + SCRIPT_GAP));

    return singleSetRam * numSets;
}
