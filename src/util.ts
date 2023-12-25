/**
 * returns a list of all server names
 * @param {NS} ns - ns namespace
 */
export function getAllServers(ns) {
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