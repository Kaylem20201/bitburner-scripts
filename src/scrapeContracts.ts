import { getAllServers } from 'util';
import { NS } from '@ns';
/** @param {NS} ns */
export async function main(ns : NS) {

	function createContractList() {
		const servers = getAllServers(ns);
		ns.print(servers);

		const contractList = new Map();

		for (const server of servers) {
			if (server === 'home') { continue; }

			const contracts = ns.ls(server, '.cct');
			if (contracts.length === 0) { continue; }
			for (const contract of contracts) { contractList.set(server,contract); }
		}

		return contractList;
	}

}