import { NS } from "@ns";
import { HWGWThreads } from "./interfaces";
import { HWGWTimings } from "./interfaces";
import { HACK_SCRIPT } from "/constantDefinitions";
import { WEAKEN_SCRIPT } from "/constantDefinitions";
import { GROW_SCRIPT } from "/constantDefinitions";

export async function main(ns: NS): Promise<void> {

    if (ns.args.length < 3) throw new Error("Malformed arguments");
    if (typeof ns.args[0] !== 'string') throw new Error("Incorrect 'target' parameter");
    if (typeof ns.args[1] !== 'string') throw new Error("Incorrect 'threadsObject' parameter");
    if (typeof ns.args[2] !== 'string') throw new Error("Incorrect 'timings' parameter");
    let hostname = 'home';
    if (ns.args.length >= 4) {
        if (typeof ns.args[3] !== 'string') throw new Error("Incorrect 'hostname' parameter");
        hostname = ns.args[3];
    }
    const target = ns.args[0];
    const threadsObject = JSON.parse(ns.args[1]);
    const timings = JSON.parse(ns.args[2]);

    await runBatchOnServer(ns, target, threadsObject, timings, hostname);

}

/**
 * Runs a single batch operation with the given threads/parameters
 * @param ns 
 * @param target Target server
 * @param threadsObject HWGWThreads object with threads defined for batch ops
 * @param hostname Optional param for server to host batch operations on
 * @returns Milliseconds it takes for operations to complete
 */
async function runBatchOnServer(ns: NS, target: string, threadsObject: HWGWThreads, timings: HWGWTimings, hostname?: string): Promise<void> {

    if (hostname === undefined) hostname = 'home';

    ns.print('Start Times: ');
    for (const time of timings.startTimes) ns.print(time.time + ',' + time.type);
    ns.print('Threads: ');
    ns.print('Weaken1: ' + threadsObject.weakenCounteringHackThreads);
    ns.print('Weaken2: ' + threadsObject.weakenCounteringGrowThreads);
    ns.print('Grow: ' + threadsObject.growThreads);
    ns.print('Hack: ' + threadsObject.hackThreads);

    for (let i = 0; i < timings.startTimes.length; i++) {
        if (timings.startTimes[i].type === 'weaken1') ns.exec(WEAKEN_SCRIPT, hostname, threadsObject.weakenCounteringHackThreads, target);
        if (timings.startTimes[i].type === 'weaken2') ns.exec(WEAKEN_SCRIPT, hostname, threadsObject.weakenCounteringGrowThreads, target);
        if (timings.startTimes[i].type === 'hack') ns.exec(HACK_SCRIPT, hostname, threadsObject.hackThreads, target);
        if (timings.startTimes[i].type === 'grow') ns.exec(GROW_SCRIPT, hostname, threadsObject.growThreads, target);
        if (i < timings.startTimes.length - 1) await ns.sleep(timings.startTimes[i + 1].time - timings.startTimes[i].time);
    }

    return;

}
