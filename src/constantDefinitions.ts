export const TARGET_SERVER_LIST = 'json/target_server_list.txt';
export const WEAKEN_SCRIPT = 'batch-scripts/weakenTarget.js';
export const GROW_SCRIPT = 'batch-scripts/growTarget.js';
export const HACK_SCRIPT = 'batch-scripts/hackTarget.js';
export const SCRIPT_GAP = 100; // millisecond gap to put between scripts

export const LOCK_REQUEST_PORT = 1;
export const LOCK_RETURN_PORT = 2;
export const BATCH_CALCULATIONS_PORT = 3;

//Successful hack increases security by 0.0002
//Successful weaken reduces by .05
export const HACK_THREADS_PER_WEAKEN_THREAD = 0.05 / 0.0002;
export const WEAKEN_THREADS_PER_HACK_THREAD = 0.0002 / 0.05;
//Successful grow increases security by 0.004
//Successful weaken reduces by .05
export const WEAKEN_THREADS_PER_GROW_THREAD = 0.004 / 0.05;
