/** @param {NS} ns */
export async function main(ns) {
	ns.tprint("Backdoor process started. The connected server may change suddenly.");

	var visitedServers = ["home"];
	var prevServer;

	await recurseServers();

	ns.singularity.connect("home");
	ns.tprint("Backdoor process completed.");

	async function recurseServers() {
		var current = ns.singularity.getCurrentServer();
		if (ns.getServer(current).backdoorInstalled != true) {
			await ns.singularity.installBackdoor();
		}
		var neighbors = ns.scan(current);
		for (var i = 0; i < neighbors.length; i++) {
			if ((visitedServers.includes(neighbors[i]) != true) && ns.hasRootAccess(neighbors[i])) {
				visitedServers.push(neighbors[i]);
				prevServer = current;
				ns.singularity.connect(neighbors[i]);
				await recurseServers();
				ns.singularity.connect(prevServer);
			}
		}
	}
}