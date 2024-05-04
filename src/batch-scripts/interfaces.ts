export interface HWGWThreads {
    hackThreads: number,
    weakenCounteringHackThreads: number,
    growThreads: number,
    weakenCounteringGrowThreads: number
}

export interface HWGWTimings {
    startTimes: { time: number, type: string }[],
    finishTimes: { time: number, type: string }[]
}
