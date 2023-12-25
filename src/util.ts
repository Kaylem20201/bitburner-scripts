import { NS } from '@ns';

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