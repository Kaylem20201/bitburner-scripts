export const CRACK_MANAGER = 'cracking/crackManager.js';
export const BATCH_MANAGER = 'batching/batchManager.js';
export const WEAKEN_SCRIPT = 'batching/weakenTarget.js';
export const GROW_SCRIPT = 'batching/growTarget.js';
export const HACK_SCRIPT = 'batching/hackTarget.js';
export const SCRIPT_GAP = 500; // millisecond gap to put between scripts

export const MANAGER_SERVER = 'home';

export enum PORTS {
    MANAGER_API_REQUEST_PORT = 1,
    MANAGER_API_RESPONSE_PORT,
    LOCK_REQUEST_PORT,
    LOCK_RETURN_PORT,
    BATCH_CALCULATIONS_PORT,
}

//Successful hack increases security by 0.0002
export const HACK_SECURITY_INCREASE = 0.0002;
//Successful weaken reduces by .05
export const WEAKEN_SECURITY_REDUCTION = 0.05;
//Successful grow increases security by 0.004
export const GROW_SECURITY_INCREASE = 0.004;

export const WEAKEN_THREADS_PER_HACK_THREAD = HACK_SECURITY_INCREASE / WEAKEN_SECURITY_REDUCTION;
export const WEAKEN_THREADS_PER_GROW_THREAD = GROW_SECURITY_INCREASE / WEAKEN_SECURITY_REDUCTION;

//Budgeting Ratios
export const PREPARING_PERCENT = 0.2;
export const BATCHING_PERCENT = 0.3;
export const CRACKING_PERCENT = 0.1;
