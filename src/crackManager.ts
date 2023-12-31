import { NS } from "@ns";
/**
 * This script should run 24/7, managing cracking new servers as we meet requirements
 * Duties such as hacking the servers or solving contracts from these servers are deferred elsewhere
 */
import { getAllServers } from "util";

export async function main(ns: NS): Promise<void> {

	/**
	 * Checks files on 'home' to create a list of currently available cracks
	 * @returns Array containing strings of the available cracks
	 */
	function getListOfCracks() {
		const cracksFull = [
			"FTPCrack.exe",
			"HTTPWorm.exe",
			"BruteSSH.exe",
			"relaySMTP.exe",
			"SQLInject.exe"
		];
		const cracks = ns.ls("home").filter((filename) => {
			cracksFull.includes(filename);
		});
		return cracks;
	}


	const servers = getAllServers(ns); //run once
	ns.print(servers);

	//Main loop
	while (true) {
		for (const server of servers) {
			if (!ns.hasRootAccess(server)) {
				const cracks = getListOfCracks();
				const portsNeeded = ns.getServerNumPortsRequired(server);
				if (cracks.length < portsNeeded) {
					break;
				}
				//Nuke the server
				const res = await crackAndNukeServer(ns, cracks, server, portsNeeded);
				if (!res) ns.exit();
				ns.print("Access granted on %s", server);

				//Always: collect contracts
				ns.scp(ns.ls(server, '.cct'), 'home', server);

				//TODO: Trigger batch hacking
			}
			else {
				//TODO: Ensure the server is being hacked
			}
		}
		await ns.sleep(5000);
	}
}

/**
 * 
 * @param cracks Array of available cracks as strings
 * @param target Name of target server
 * @param portNum Number of 
 * @returns 
 */
async function crackAndNukeServer(ns : NS, cracks: string[], target: string, portNum: number): Promise<boolean> {
	for (let i = 0; i < portNum; i++) {
		const crack = cracks.pop();
		switch (crack) {
			case "FTPCrack.exe":
				ns.ftpcrack(target);
				break;
			case "HTTPWorm.exe":
				ns.httpworm(target);
				break;
			case "BruteSSH.exe":
				ns.brutessh(target);
				break;
			case "relaySMTP.exe":
				ns.relaysmtp(target);
				break;
			case "SQLInject.exe":
				ns.sqlinject(target);
				break;
			default:
				ns.tprint("ERROR : Failure in crackManager, crackAndNukeServer()");
				return false;
		}
	}
	ns.nuke(target);
	if (ns.hasRootAccess(target)) return true;
	else {
		ns.tprint("ERROR : Failure in crackManager, crackAndNukeServer()");
		return false;
	}
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhd2xOZXR3b3JrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NyYXdsTmV0d29yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsS0FBSyxVQUFVLElBQUksQ0FBQyxFQUFNO0lBRTdCLFNBQVMsYUFBYTtRQUV6QixNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3JDLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMvQjthQUNHO1NBQ0o7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUVaLENBQUM7SUFFRCxLQUFLLFVBQVUsa0JBQWtCLENBQ2hDLE1BQWlCLEVBQ2pCLE1BQWUsRUFDZixPQUFnQjtRQUNwQixLQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMzQixRQUFPLEtBQUssRUFBRTtnQkFDakIsS0FBSyxjQUFjO29CQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3RDLE1BQU07Z0JBQ1YsS0FBSyxjQUFjO29CQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3RDLE1BQU07Z0JBQ1YsS0FBSyxjQUFjO29CQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3RDLE1BQU07Z0JBQ1YsS0FBSyxlQUFlO29CQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hDLE1BQU07Z0JBQ1YsS0FBSyxlQUFlO29CQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hDLE1BQU07Z0JBQ1Y7b0JBQVMsRUFBRSxDQUFDLE1BQU0sQ0FBQywwREFBMEQsQ0FBQyxDQUFDO29CQUMzRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDVjtTQUNKO1FBQ0QsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RCLElBQ0csQUFEQztZQUNELEFBREMsQ0FBQTtJQUNELENBQUM7SUFFRCxTQUFTLGVBQWU7UUFDM0IsTUFBTSxVQUFVLEdBQUc7WUFDZixjQUFjO1lBQ2QsY0FBYztZQUNkLGNBQWM7WUFDZCxlQUFlO1lBQ2YsZUFBZTtTQUNsQixDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM3QyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxNQUFNLENBQUM7SUFDWCxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxFQUFFLENBQUM7SUFFaEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7UUFDakMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUU7WUFDbkIsTUFBTSxNQUFNLEdBQUcsZUFBZSxFQUFFLENBQUM7WUFDakMsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU07YUFDRjtZQUNELGlCQUFpQjtZQUNqQixrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1NBQ25EO2FBQ0k7WUFDRCxtQ0FBbUM7U0FDdEM7UUFDRCwyQkFBMkI7S0FFdkI7QUFFTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTlMgfSBmcm9tIFwiQG5zXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKG5zOiBOUyk6IFByb21pc2U8dm9pZD4ge1xuXG4gICAgZnVuY3Rpb24gZ2V0QWxsU2VydmVycygpIHtcblxuXHRjb25zdCBzZXJ2ZXJzID0gbmV3IEFycmF5KCk7XG5cdHNlcnZlcnMucHVzaChucy5zY2FuKFwiaG9tZVwiKSk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2VydmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgY29uc3QgbmV3U2VydmVycyA9IG5zLnNjYW4oc2VydmVyc1tpXSk7XG5cdCAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5ld1NlcnZlcnMubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIXNlcnZlcnMuaW5jbHVkZXMobmV3U2VydmVyc1tqXSkpIHtcblx0XHQgICAgc2VydmVycy5wdXNoKG5ld1NlcnZlcnNbal0pO1xuXHRcdH1cblx0ICAgIH1cblx0fVxuXHRyZXR1cm4gc2VydmVycztcblxuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIGNyYWNrQW5kTnVrZVNlcnZlcihcblx0ICAgIGNyYWNrcyA6IHN0cmluZ1tdLFxuXHQgICAgdGFyZ2V0IDogc3RyaW5nLFxuXHQgICAgcG9ydE51bSA6IG51bWJlcikge1xuXHRmb3IobGV0IGkgPSAwOyBpIDwgcG9ydE51bTsgaSsrKSB7XG5cdCAgICBjb25zdCBjcmFjayA9IGNyYWNrcy5wb3AoKTtcblx0ICAgIHN3aXRjaChjcmFjaykge1xuXHRcdGNhc2UgXCJGVFBDcmFjay5leGVcIiA6IG5zLmZ0cGNyYWNrKHRhcmdldCk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdGNhc2UgXCJIVFRQV29ybS5leGVcIiA6IG5zLmh0dHB3b3JtKHRhcmdldCk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdGNhc2UgXCJCcnV0ZVNTSC5leGVcIiA6IG5zLmJydXRlc3NoKHRhcmdldCk7XG5cdFx0ICAgIGJyZWFrO1xuXHRcdGNhc2UgXCJyZWxheVNNVFAuZXhlXCIgOiBucy5yZWxheXNtdHAodGFyZ2V0KTtcblx0XHQgICAgYnJlYWs7XG5cdFx0Y2FzZSBcIlNRTEluamVjdC5leGVcIiA6IG5zLnNxbGluamVjdCh0YXJnZXQpO1xuXHRcdCAgICBicmVhaztcblx0XHRkZWZhdWx0OiBucy50cHJpbnQoXCJFUlJPUiA6IEZhaWx1cmUgaW4gY3Jhd2xOZXR3b3JrLm5zLCBjcmFja0FuZE51a2VTZXJ2ZXIoKVwiKTtcblx0XHQgICAgbnMuZXhpdCgpO1xuXHQgICAgfVxuXHR9XG5cdGF3YWl0IG5zLm51a2UodGFyZ2V0KTtcblx0aWYgKFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpc3RPZkNyYWNrcygpIHtcblx0Y29uc3QgY3JhY2tzRnVsbCA9IFtcblx0ICAgIFwiRlRQQ3JhY2suZXhlXCIsXG5cdCAgICBcIkhUVFBXb3JtLmV4ZVwiLFxuXHQgICAgXCJCcnV0ZVNTSC5leGVcIixcblx0ICAgIFwicmVsYXlTTVRQLmV4ZVwiLFxuXHQgICAgXCJTUUxJbmplY3QuZXhlXCJcblx0XTtcblx0Y29uc3QgY3JhY2tzID0gbnMubHMoXCJob21lXCIpLmZpbHRlcigoZmlsZW5hbWUpID0+IHtcblx0ICAgIGNyYWNrc0Z1bGwuaW5jbHVkZXMoZmlsZW5hbWUpO1xuXHR9KTtcblxuXHRyZXR1cm4gY3JhY2tzO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlcnMgPSBnZXRBbGxTZXJ2ZXJzKCk7XG5cbiAgICBmb3IgKGNvbnN0IHNlcnZlciBpbiBzZXJ2ZXJzKSB7XG5cdGlmICghbnMuaGFzUm9vdEFjY2Vzcykge1xuXHQgICAgY29uc3QgY3JhY2tzID0gZ2V0TGlzdE9mQ3JhY2tzKCk7XG5cdCAgICBjb25zdCBwb3J0c05lZWRlZCA9IG5zLmdldFNlcnZlck51bVBvcnRzUmVxdWlyZWQoc2VydmVyKTtcblx0ICAgIGlmIChjcmFja3MubGVuZ3RoIDwgcG9ydHNOZWVkZWQpIHtcblx0XHRicmVhaztcblx0ICAgIH1cblx0ICAgIC8vTnVrZSB0aGUgc2VydmVyXG5cdCAgICBjcmFja0FuZE51a2VTZXJ2ZXIoY3JhY2tzLCBzZXJ2ZXIsIHBvcnRzTmVlZGVkKTtcblx0fVxuXHRlbHNlIHtcblx0ICAgIC8vRW5zdXJlIHRoZSBzZXJ2ZXIgaXMgYmVpbmcgaGFja2VkXG5cdH1cblx0Ly9BbHdheXM6IGNvbGxlY3QgY29udHJhY3RzXG5cbiAgICB9XG5cbn1cbiJdfQ==