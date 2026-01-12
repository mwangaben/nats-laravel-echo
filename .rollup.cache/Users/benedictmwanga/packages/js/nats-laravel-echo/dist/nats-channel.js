import { JSONCodec, StringCodec } from 'nats.ws';
export class NatsChannel {
    constructor(name, connection, options = {}) {
        this.subscription = null;
        this.callbacks = new Map();
        this.jsonCodec = JSONCodec();
        this.stringCodec = StringCodec();
        this.subscribed = false;
        this.name = name;
        this.connection = connection;
        this.options = options;
    }
    subscribe() {
        if (this.subscribed) {
            return this;
        }
        this.subscription = this.connection.subscribe(this.name);
        this.subscribed = true;
        (async () => {
            if (this.subscription) {
                for await (const msg of this.subscription) {
                    try {
                        const data = this.jsonCodec.decode(msg.data);
                        if (data && data.event) {
                            this.handleEvent(data.event, data);
                        }
                    }
                    catch (error) {
                        console.error('Error processing message:', error);
                    }
                }
            }
        })();
        return this;
    }
    listen(event, callback) {
        const eventKey = `${this.name}.${event}`;
        this.callbacks.set(eventKey, callback);
        return this;
    }
    notification(callback) {
        return this.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', callback);
    }
    handleEvent(event, data) {
        const eventKey = `${this.name}.${event}`;
        const callback = this.callbacks.get(eventKey);
        if (callback) {
            callback(data.data);
        }
        // Also check for wildcard listeners
        const wildcardKey = `${this.name}.*`;
        const wildcardCallback = this.callbacks.get(wildcardKey);
        if (wildcardCallback) {
            wildcardCallback({ event, data: data.data });
        }
    }
    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.subscribed = false;
        this.callbacks.clear();
    }
    stopListening(event) {
        const eventKey = `${this.name}.${event}`;
        this.callbacks.delete(eventKey);
        return this;
    }
}
export class NatsPrivateChannel extends NatsChannel {
    constructor(name, connection, options) {
        super(name, connection, options);
        this.authEndpoint = options.authEndpoint;
        this.headers = options.headers || {};
    }
    async subscribe() {
        if (this.authEndpoint && this.name.startsWith('private-')) {
            await this.authenticate();
        }
        // Call parent's subscribe method
        return super.subscribe();
    }
    async authenticate() {
        try {
            const response = await fetch(this.authEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...this.headers
                },
                body: JSON.stringify({
                    channel_name: this.name
                })
            });
            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.statusText}`);
            }
        }
        catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    whisper(eventName, data) {
        const subject = `${this.name}.client-${eventName}`;
        const payload = this.jsonCodec.encode({
            event: `client-${eventName}`,
            data: data,
            channel: this.name
        });
        this.connection.publish(subject, payload);
    }
}
export class NatsPresenceChannel extends NatsPrivateChannel {
    constructor(name, connection, options) {
        super(name, connection, options);
        this.presenceCallbacks = {};
    }
    here(callback) {
        this.presenceCallbacks.here = callback;
        return this;
    }
    joining(callback) {
        this.presenceCallbacks.joining = callback;
        return this;
    }
    leaving(callback) {
        this.presenceCallbacks.leaving = callback;
        return this;
    }
    handleEvent(event, data) {
        // Handle presence events
        if (event === 'presence:here' && this.presenceCallbacks.here) {
            this.presenceCallbacks.here(data.data);
        }
        else if (event === 'presence:joining' && this.presenceCallbacks.joining) {
            this.presenceCallbacks.joining(data.data);
        }
        else if (event === 'presence:leaving' && this.presenceCallbacks.leaving) {
            this.presenceCallbacks.leaving(data.data);
        }
        else {
            super.handleEvent(event, data);
        }
    }
}
//# sourceMappingURL=nats-channel.js.map