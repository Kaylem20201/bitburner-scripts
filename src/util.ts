import { NS } from '@ns';

const GROW_SCRIPT = 'batch-scripts/growTarget.js';
const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';

/**
 * returns a list of all server names
 * @param {NS} ns - ns namespace
 */
export function getAllServers(ns : NS) {
	const servers = ['home'];
	servers.push(...ns.scan('home'));
	ns.print(servers);
	for (let i = 1; i < servers.length; i++) {
		const newServers = ns.scan(servers[i]);
		for (let j = 0; j < newServers.length; j++) {
			if (!servers.includes(newServers[j])) {
				servers.push(newServers[j]);
			}
		}
	}
	return servers;
}

/**
 * Calculates the amount of threads available for a script,
 * given an amount of ram and the script cost
 * 
 * @param availableRam Ram available for script to run on
 * @param scriptCost The ram cost of running the script on one thread
 * @returns Max number of threads the script can run on
 */
export function getThreadsAvailable(availableRam : number, scriptCost : number) : number {
	
	return Math.floor(availableRam / scriptCost);

}

/**
 * Function to calculate the number of growth threads needed to grow a server to max money.
 * @param ns netscript
 * @param target target hostname
 * @param hostname host hostname
 * @returns number of threads needed to grow target to max money
 */
export function growAnalyzePrep(ns : NS, target : string, hostname : string) : {
	threadsNeeded : number,
	securityIncrease : number
}	{

    const growthFactorNeeded = ns.getServerMaxMoney(target)/ns.getServerMoneyAvailable(target);
    const cores = ns.getServer(hostname).cpuCores;
    const growThreadsNeeded = Math.max(1,Math.ceil(ns.growthAnalyze(target,growthFactorNeeded,cores)));
	const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreadsNeeded, target, cores);

	return {threadsNeeded : growThreadsNeeded, securityIncrease : growSecurityIncrease};

}

/**
 * Checks to see if the Formulas API is available
 * 
 * @param Netscript namespace
 * @returns True if Formulas is available, false otherwise
 */
export function isFormulasAvailable(ns : NS) : boolean {
	const formulasAvailable : boolean = (ns.ls('home','Formulas.exe').length > 0);
	return formulasAvailable;
}