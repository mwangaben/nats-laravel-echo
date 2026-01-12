import { createNatsEcho, SimpleNatsEcho } from './simple';
import type { NatsEchoOptions } from './simple';

// Export main classes and functions
export { createNatsEcho, SimpleNatsEcho };

// Export types
export type { NatsEchoOptions };

// Re-export common types for compatibility
export type Channel = any;
export type PrivateChannel = any;
export type PresenceChannel = any;
export type EventCallback = Function;

// Default export for convenience
export default createNatsEcho;

// Also export as window.Echo compatible factory
export const Echo = createNatsEcho;

// For CommonJS compatibility
declare const module: any;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNatsEcho,
        SimpleNatsEcho,
        Echo: createNatsEcho,
        default: createNatsEcho
    };
}