import { NS } from "@ns";
import { HWGWThreads } from "batch-scripts/interfaces";

export async function main(ns: NS): Promise<void> {

}

/**
 * Returns the amount of threads needed to take the maximum amount of money from
 * a server in a single batch operation
 * @param ns netscript namespace
 * @param target Target hostname for batch operations
 * @param hostname Hostname that the batch operations are hosted from
 * @returns A HWGWThreads object with the number of threads needed for each op
 */
export function threadsNeededForMaxMoney(ns: NS, target: string, hostname?: string): HWGWThreads {

    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target)));
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, target);
    const weaken1Threads = Math.max(1, Math.ceil(hackSecurityIncrease / 0.05));
    let cores: number;
    if (hostname !== undefined) cores = ns.getServer(hostname).cpuCores;
    else cores = ns.getServer('home').cpuCores;
    const growThreads = Math.ceil(ns.growthAnalyze(target, 2, cores));
    const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, undefined, cores);
    const weaken2Threads = Math.max(1, Math.ceil(growSecurityIncrease / 0.05));

    return {
        hackThreads,
        weaken1Threads,
        growThreads,
        weaken2Threads
    };

}
