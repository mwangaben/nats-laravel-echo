import { createNatsEcho, SimpleNatsEcho } from './simple';
// Export main classes and functions
export { createNatsEcho, SimpleNatsEcho };
// Default export for convenience
export default createNatsEcho;
// Also export as window.Echo compatible factory
export const Echo = createNatsEcho;
// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNatsEcho,
        SimpleNatsEcho,
        Echo: createNatsEcho,
        default: createNatsEcho
    };
}
//# sourceMappingURL=index.js.map