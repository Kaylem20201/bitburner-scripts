import { NS } from '@ns';
import {
    GROW_SCRIPT,
    SCRIPT_GAP,
    WEAKEN_SCRIPT,
    WEAKEN_THREADS_PER_GROW_THREAD,
} from '/constantDefinitions';

export async function main(ns: NS): Promise<void> {
    const targetName = ns.args[0];
    if (typeof targetName !== 'string') throw new Error();

    const ramBudget = ns.args[1];
    if (typeof ramBudget !== 'number') throw new Error();
    if (ramBudget < 1.0) throw new Error();

    const minSecLevel = ns.getServerMinSecurityLevel(targetName);
    const maxMoney = ns.getServerMaxMoney(targetName);

    const weakenRam = ns.getScriptRam(WEAKEN_SCRIPT);
    const growRam = ns.getScriptRam(GROW_SCRIPT);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const growTime = ns.getGrowTime(targetName);
        const weakenTime = ns.getWeakenTime(targetName);
        const currSecLevel = ns.getServerSecurityLevel(targetName);
        const currMoney = ns.getServerMoneyAvailable(targetName);

        if (currSecLevel > minSecLevel) {
            ns.print('Weakening...');
            const weakenThreads = Math.floor(ramBudget / weakenRam);
            ns.exec(WEAKEN_SCRIPT, 'home', weakenThreads);
            await ns.sleep(weakenTime);
            continue;
        }

        if (currMoney === maxMoney) break;

        const singleThreadCost =
            growRam + WEAKEN_THREADS_PER_GROW_THREAD * weakenRam;
        const growThreads = Math.floor(ramBudget / singleThreadCost);
        const weakenThreads = growThreads * WEAKEN_THREADS_PER_GROW_THREAD;

        const timeDiff = weakenTime - growTime;

        await ns.sleep(SCRIPT_GAP);
    }
}
