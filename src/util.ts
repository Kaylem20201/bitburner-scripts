import { NS } from '@ns';

const GROW_SCRIPT = 'batch-scripts/growTarget.js';
const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';

/**
 * Debugging tool
 */
export class Debug {
	active : boolean = false;
	logging : boolean = false;
	readonly ns : NS;

	constructor(ns : NS) {
		this.ns = ns;
	}

	/**
	 * Activate debug mode.
	 * @remarks
	 * Spawns a tail window and sets 'active' to true.
	 * Initializing NS object
	 * 
	 */
	activate(...opts : string[]) : void {
        this.active = true;
        this.ns.tail();
        this.print("Debugging mode active.");
		if(opts.includes('logs')) { this.logging = true; }
	}

	/**
	 * Deactivates debug mode
	 */
	deactivate() : void {
		this.active = false;
		this.ns.print("Debugging deactivated");
		if(this.logging) { this.log(); }
	}

	/**
	 * Prints only if debugging is active
	 * @param args Arguments to print
	 */
	print(...args : any[]) : void {
		if (this.active) { this.ns.print(...args) };
	}

	log() : string {
		const scriptInfo = this.ns.getRunningScript();
		if (scriptInfo === null) throw new Error();
		const filename = 'logs/debugLog' + scriptInfo.filename + scriptInfo.pid;
		this.ns.write(
			filename,
			...this.ns.getScriptLogs(scriptInfo.pid)
		);
		return filename;
	}

	error(errorArg : Error) {
		if (this.logging) { 
			const filename = this.log();
			errorArg.message = errorArg.message + '\nLogs at:' + filename;
		}
		throw errorArg;
	}
}

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
	const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreadsNeeded, undefined, cores);

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