import { create } from 'zustand';

const useDebugStore = create((set, get) => ({
    logs: [],
    
    addLog: (log) => set((state) => {
        const newLog = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            level: log.level || 'info', // 'info', 'warn', 'error', 'success'
            source: log.source || 'unknown',
            message: log.message || '',
            details: log.details || null,
        };
        // Keep only last 100 logs to avoid memory leaks
        return { logs: [newLog, ...state.logs].slice(0, 100) };
    }),

    clearLogs: () => set({ logs: [] }),

    getLogsAsText: () => {
        const { logs } = get();
        return logs.map(l => 
            `[${new Date(l.timestamp).toLocaleString()}] [${l.level.toUpperCase()}] [${l.source}]\nMessage: ${l.message}\nDetails: ${l.details ? JSON.stringify(l.details, null, 2) : 'N/A'}\n-------------------------`
        ).join('\n\n');
    }
}));

export default useDebugStore;
