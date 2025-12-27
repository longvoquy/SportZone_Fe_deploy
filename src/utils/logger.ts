const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        // We might want to always log errors, or at least in dev
        if (isDev) {
            console.error(...args);
        }
    },
    debug: (...args: any[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },
    // Group related logs to reduce noise
    group: (label: string, data: any) => {
        if (isDev) {
            console.groupCollapsed(label);
            console.log(data);
            console.groupEnd();
        }
    }
};

export default logger;
