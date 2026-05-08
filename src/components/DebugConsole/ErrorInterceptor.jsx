import { useEffect } from 'react';
import useDebugStore from '../../store/debugStore';

const ErrorInterceptor = () => {
    useEffect(() => {
        const addLog = useDebugStore.getState().addLog;

        // 1. window.onerror
        const originalOnError = window.onerror;
        window.onerror = function (message, source, lineno, colno, error) {
            addLog({
                level: 'error',
                source: 'window.onerror',
                message: message.toString(),
                details: { source, lineno, colno, stack: error?.stack }
            });
            if (originalOnError) return originalOnError.apply(this, arguments);
            return false;
        };

        // 2. unhandledrejection
        const onUnhandledRejection = (event) => {
            addLog({
                level: 'error',
                source: 'unhandledrejection',
                message: event.reason?.message || event.reason?.toString() || 'Promise rejection non gestita',
                details: { stack: event.reason?.stack, reason: event.reason }
            });
        };
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        // 3. console.error & console.warn
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.error = function (...args) {
            const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (!message.includes('__NEXT_PRIVATE') && !message.includes('Warning: React does not recognize')) {
                addLog({
                    level: 'error',
                    source: 'console.error',
                    message: message,
                    details: { args }
                });
            }
            originalConsoleError.apply(console, args);
        };

        console.warn = function (...args) {
            const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (!message.includes('__NEXT_PRIVATE') && !message.includes('Warning: ')) {
                addLog({
                    level: 'warn',
                    source: 'console.warn',
                    message: message,
                    details: { args }
                });
            }
            originalConsoleWarn.apply(console, args);
        };

        // 4. window.fetch
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    addLog({
                        level: response.status >= 500 ? 'error' : 'warn',
                        source: 'fetch',
                        message: `Fetch failed: ${response.status} ${response.statusText}`,
                        details: { url: args[0], status: response.status }
                    });
                }
                return response;
            } catch (error) {
                addLog({
                    level: 'error',
                    source: 'fetch',
                    message: `Fetch network error: ${error.message}`,
                    details: { url: args[0], stack: error.stack }
                });
                throw error;
            }
        };

        // 5. XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._method = method;
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            this.addEventListener('load', function () {
                if (this.status >= 400) {
                    addLog({
                        level: this.status >= 500 ? 'error' : 'warn',
                        source: 'XMLHttpRequest',
                        message: `XHR failed: ${this.status} ${this.statusText}`,
                        details: { url: this._url, method: this._method, status: this.status }
                    });
                }
            });
            this.addEventListener('error', function () {
                addLog({
                    level: 'error',
                    source: 'XMLHttpRequest',
                    message: `XHR network error`,
                    details: { url: this._url, method: this._method }
                });
            });
            return originalSend.apply(this, args);
        };

        // 6. window.WebSocket
        const originalWebSocket = window.WebSocket;
        if (originalWebSocket) {
            window.WebSocket = function (url, protocols) {
                const ws = new originalWebSocket(url, protocols);
                ws.addEventListener('error', (event) => {
                    addLog({
                        level: 'error',
                        source: 'WebSocket',
                        message: `WebSocket error su ${url}`,
                        details: { url }
                    });
                });
                ws.addEventListener('close', (event) => {
                    if (!event.wasClean) {
                        addLog({
                            level: 'warn',
                            source: 'WebSocket',
                            message: `WebSocket chiusa male: code ${event.code}`,
                            details: { url, code: event.code, reason: event.reason }
                        });
                    }
                });
                return ws;
            };
            window.WebSocket.prototype = originalWebSocket.prototype;
        }

        // 7. Event listener globale sulla fase di capture per le risorse (img, script, ecc.)
        const onResourceError = (event) => {
            // Se l'errore è da window.onerror ignoriamo
            if (event.message || event.error) return; 
            
            const target = event.target || event.srcElement;
            const isElement = target && target instanceof HTMLElement;
            if (isElement) {
                const tag = target.tagName.toLowerCase();
                const src = target.src || target.href;
                if (src) {
                    addLog({
                        level: 'error',
                        source: 'Resource',
                        message: `Fallimento caricamento risorsa: <${tag}>`,
                        details: { tag, src }
                    });
                }
            }
        };
        window.addEventListener('error', onResourceError, true);

        return () => {
            window.onerror = originalOnError;
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            window.fetch = originalFetch;
            XMLHttpRequest.prototype.open = originalOpen;
            XMLHttpRequest.prototype.send = originalSend;
            if (originalWebSocket) {
                window.WebSocket = originalWebSocket;
            }
            window.removeEventListener('error', onResourceError, true);
        };
    }, []);

    return null;
};

export default ErrorInterceptor;
