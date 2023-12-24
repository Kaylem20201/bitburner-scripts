/** @param {NS} ns **/
export async function main(ns) {

	var stats;
	stats = ns.getPlayer();
	while (stats.strength < ns.args[0]) {
		ns.gymWorkout("Powerhouse Gym", "Strength");
		while (stats.strength < ns.args[0]) {
			await ns.sleep(1000);
			stats = ns.getPlayer()
		}
	}
	while (stats.dexterity < ns.args[0]) {
		ns.gymWorkout("Powerhouse Gym", "Dexterity");
		while (stats.dexterity < ns.args[0]) {
			await ns.sleep(1000);
			stats = ns.getPlayer()
		}
	}
	while (stats.defense < ns.args[0]) {
		ns.gymWorkout("Powerhouse Gym", "Defense");
		while (stats.defense < ns.args[0]) {
			await ns.sleep(1000);
			stats = ns.getPlayer()
		}
	}
	while (stats.agility < ns.args[0]) {
		ns.gymWorkout("Powerhouse Gym", "Agility");
		while (stats.agility < ns.args[0]) {
			await ns.sleep(1000);
			stats = ns.getPlayer()
		}
	}



}