/**
 * Stellar Light Client - Networking Module
 * 
 * This module handles the WebSocket connection to the Stellar server
 * and implements the networking protocol.
 */

// Constants for handshaking and authentication states
const HANDSHAKING = 'handshaking';
const HANDSHAKING_ACK = 'handshaking_ack';
const AUTHENTICATING = 'authenticating';
const AUTHENTICATED = 'authenticated';

// HandshakingState enum
const HandshakingState = {
    HANDSHAKING: 0,
    CONNECTED: 1,
    AUTHENTICATING: 2,
    AUTHENTICATED: 3
};

/**
 * StellarNetworkClient - Main client class for handling Stellar networking
 */
class StellarNetworkClient {
    constructor() {
        this.socket = null;
        this.state = HandshakingState.HANDSHAKING;
        this.userId = null;
        this.myIp = null;
        this.observers = {};
        this.connected = false;
        this.callbacks = {};

        this.renderPixelsWidth = 0;
        this.renderPixelsHeight = 0;
        
        // Message queues
        this.incomingPacketQueue = [];
        this.outgoingPacketQueue = [];
        
        // Rate limiting
        this.outgoingPacketInterval = 1000 / 30; // 30 packets per second
        this.lastPacketSentTime = 0;
        
        // Network events buffer
        this.netEventsBuffer = [];
        
        // Last input state to track changes
        this.lastInput = {};
        
        // Input state constants
        this.PRESSED = "PRESSED";
        this.RELEASED = "RELEASED";
        this.ACTIVE = "ACTIVE";
        this.INACTIVE = "INACTIVE";
        
        // Configure logger
        this.log = this.setupLogger();
    }
    
    /**
     * Set up a simple logger that outputs to the console and UI
     */
    setupLogger() {
        const logOutput = document.getElementById('log-output');
        
        return {
            info: (message) => {
                console.info(message);
                this.appendToLogUI(message, 'info');
            },
            error: (message) => {
                console.error(message);
                this.appendToLogUI(message, 'error');
            },
            success: (message) => {
                console.log(message);
                this.appendToLogUI(message, 'success');
            },
            warning: (message) => {
                console.warn(message);
                this.appendToLogUI(message, 'warning');
            }
        };
    }
    
    /**
     * Add log message to the UI
     */
    appendToLogUI(message, type) {
        const logOutput = document.getElementById('log-output');
        if (!logOutput) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logOutput.appendChild(entry);
        logOutput.scrollTop = logOutput.scrollHeight;
    }
    
    /**
     * Register a callback for different events
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    /**
     * Trigger a registered callback
     */
    trigger(event, ...args) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(...args));
        }
    }
    
    /**
     * Connect to the Stellar server
     */
    connect(host, port, userId) {
        this.userId = userId;
        const wsUrl = `ws://${host}:${port}`;
        
        this.log.info(`Connecting to ${wsUrl}...`);
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.binaryType = 'arraybuffer';
            
            this.socket.onopen = this.handleOpen.bind(this);
            this.socket.onmessage = this.handleMessage.bind(this);
            this.socket.onclose = this.handleClose.bind(this);
            this.socket.onerror = this.handleError.bind(this);
            
            this.connected = true;
            this.updateConnectionStatus();
            
            // Start the packet processing loops
            this.startPacketProcessingLoops();
            
            return true;
        } catch (error) {
            this.log.error(`Connection error: ${error.message}`);
            this.connected = false;
            this.updateConnectionStatus();
            return false;
        }
    }
    
    /**
     * Update the connection status display
     */
    updateConnectionStatus() {
        const statusEl = document.getElementById('connection-status');
        const connectBtn = document.getElementById('connect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const sendBtn = document.getElementById('send-btn');
        
        if (statusEl) {
            statusEl.textContent = this.connected ? 'Connected' : 'Disconnected';
            statusEl.className = this.connected ? 'connected' : '';
        }
        
        if (connectBtn) {
            connectBtn.disabled = this.connected;
        }
        
        if (disconnectBtn) {
            disconnectBtn.disabled = !this.connected;
        }
        
        if (sendBtn) {
            sendBtn.disabled = !this.connected;
        }
    }
    
    /**
     * Handle WebSocket open event
     */
    handleOpen(event) {
        this.log.success('WebSocket connection established');
        
        // Wait for the server to send IP address
        // The handshaking will continue in the handleMessage method after receiving the IP
    }
    
    /**
     * Handle WebSocket message event
     */
    handleMessage(event) {
        try {
            const data = new Uint8Array(event.data);
            
            // In WebSockets, there's no need for message length header
            // as WebSocket frames already handle message boundaries
            
            // If we're waiting for IP address
            if (this.state === HandshakingState.HANDSHAKING && !this.myIp) {
                // First message is our IP address as a string
                this.myIp = new TextDecoder().decode(data);
                this.log.info(`Received IP address: ${this.myIp}`);
                
                // Trigger the ip_received event
                this.trigger('ip_received', this.myIp);
                
                // Start handshaking
                this.log.info('Starting handshake with server...');
                this.sendString(HANDSHAKING);
                return;
            }
            
            // Handle different states
            if (this.state === HandshakingState.HANDSHAKING) {
                const response = new TextDecoder().decode(data);
                if (response === HANDSHAKING_ACK) {
                    this.log.success('Handshake successful');
                    this.state = HandshakingState.CONNECTED;
                    
                    // Begin authentication
                    this.log.info(`Starting authentication with server as user ${this.userId}...`);
                    this.sendString(`${AUTHENTICATING}:${this.userId}`);
                } else {
                    this.log.error('Handshake failed');
                    this.disconnect();
                }
                return;
            }
            
            if (this.state === HandshakingState.CONNECTED) {
                const response = new TextDecoder().decode(data);
                if (response === AUTHENTICATED) {
                    this.log.success('Authentication successful');
                    this.state = HandshakingState.AUTHENTICATED;
                    this.trigger('authenticated');
                } else {
                    this.log.error('Authentication failed');
                    this.disconnect();
                }
                return;
            }
            
            // For authenticated state, process normal messages
            if (this.state === HandshakingState.AUTHENTICATED) {
                try {
                    // Deserialize packet using msgpack
                    const packet = msgpack.decode(data);
                    this.incomingPacketQueue.push(packet);
                } catch (error) {
                    this.log.error(`Error deserializing packet: ${error.message}`);
                }
                return;
            }

            // any other state
            this.log.error(`Unknown state: ${this.state}`);
        } catch (error) {
            this.log.error(`Error handling message: ${error.message}`);
        }
    }
    
    /**
     * Handle WebSocket close event
     */
    handleClose(event) {
        this.log.warning(`WebSocket closed: ${event.code} ${event.reason}`);
        this.connected = false;
        this.updateConnectionStatus();
        this.trigger('disconnected');
    }
    
    /**
     * Handle WebSocket error event
     */
    handleError(event) {
        this.log.error('WebSocket error');
        this.connected = false;
        this.updateConnectionStatus();
    }
    
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
        
        this.connected = false;
        this.state = HandshakingState.HANDSHAKING;
        this.myIp = null;
        this.updateConnectionStatus();
        this.log.info('Disconnected from server');
    }
    
    /**
     * Send a string message to the server
     */
    sendString(message) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.log.error('Cannot send message: Not connected');
            return false;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            this.socket.send(data);
            return true;
        } catch (error) {
            this.log.error(`Error sending message: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Send a packet to the server
     */
    sendPacket(packet) {
        // Queue the packet for sending
        this.outgoingPacketQueue.push(packet);
    }
    
    /**
     * Add a network event to the buffer
     */
    sendNetEvent(eventType, eventData) {
        const event = {
            type: eventType,
            ...eventData
        };
        
        this.netEventsBuffer.push(event);
        this.log.info(`Added net event: ${eventType}`);
    }
    
    /**
     * Process the input state and pack changes
     */
    packInputMessages(input) {
        // Only send changed inputs
        const filteredInput = {};
        let hasChanges = false;
        
        for (const key in input) {
            if (this.lastInput[key] === undefined || input[key] !== this.lastInput[key]) {
                filteredInput[key] = input[key];
                this.lastInput[key] = input[key];
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            const message = {
                input: filteredInput
            };
            
            // Add any pending net events
            if (this.netEventsBuffer.length > 0) {
                message.net_events = [...this.netEventsBuffer];
                this.netEventsBuffer = [];
            }
            
            this.outgoingPacketQueue.push(JSON.stringify(message));
        }
    }
    
    /**
     * Request a texture from the server
     */
    requestTexture(textureName) {
        const message = {
            request_texture: [textureName]
        };
        
        this.outgoingPacketQueue.push(JSON.stringify(message));
        this.log.info(`Requested texture: ${textureName}`);
    }

    parseObservers(observers_string) {
        // Initialize an empty object to store observers
        const observers = {};
        
        // Split the string by underscore
        const parts = observers_string.split('_');
        
        // Skip the first element (prefix)
        parts.shift();
        
        // Process each observer entry
        for (const part of parts) {
            if (part.length > 0) {
                // Split by question mark to get id and address
                const obs_data = part.split('?');
                if (obs_data.length >= 2) {
                    const id = obs_data[0];
                    const addr = obs_data[1];
                    // Store with address as key and id as value
                    observers[addr] = id;
                }
            }
        }
        
        return observers;
    }

    getMyObjectId() {
        return this.observers[this.myIp]?.toString();
    }

    getMyRenderPixels(delta) {
        const myObjectId = this.getMyObjectId();

        try {
            const myDelta = StellarUtils.searchTree(delta, myObjectId);
            if (myDelta != undefined) {
                const renderPixels = StellarUtils.searchTree(myDelta, "renderpixels");
                return renderPixels;
            }
        } catch (error) {
            this.log.error(`Error getting render pixels: ${error.message}`);
        }

        return undefined;
    }
    
    /**
     * Handle an incoming packet from the server
     * @param {Object} packet - The deserialized packet object
     */
    handlePacket(packet) {
        if (!packet) {
            this.log.error('Received empty packet');
            return;
        }
        
        try {
            if (Object.keys(this.observers).length == 0) {
                // first packet
                // watch all the packets to find the my_object_id
                if (packet.observers) {
                    this.observers = this.parseObservers(packet.observers);
                    this.log.info(`Parsed observers: ${JSON.stringify(this.observers)}`);
                    // find my object id in the observers
                    if (this.observers[this.myIp]) {
                        this.log.info(`My object id: ${this.getMyObjectId()}`);
                    }
                }
            } else {
                // Now we can handle the packet

                // Check for different packet types and handle accordingly
                if (packet.delta) {
                    // get my delta
                    const myObjectId = this.getMyObjectId();
                    const myRenderPixels = this.getMyRenderPixels(packet.delta);

                    if (myRenderPixels != undefined) {

                        if (myRenderPixels.width) {
                            this.renderPixelsWidth = myRenderPixels.width;
                        }
                        if (myRenderPixels.height) {
                            this.renderPixelsHeight = myRenderPixels.height;
                        }
                        
                        // trigger render pixels
                        this.trigger('render_pixels', myRenderPixels, this.renderPixelsWidth, this.renderPixelsHeight);
                    }

                    // const myDelta = packet.delta[myObjectId];
                    // this.log.info(`Found My delta`);
                    // Handle delta packet
       
                } else {
                    
                    // // Unknown packet type
                    // this.log.warning(`Unknown packet type received: ${JSON.stringify(packet)}`);
                    // this.trigger('unknown_packet', packet);
                }
            }
       
        } catch (error) {
            this.log.error(`Error processing packet: ${error.message}`);
        }
    }
    
    /**
     * Start the packet processing loops
     */
    startPacketProcessingLoops() {
        // Process incoming packets
        setInterval(() => {
            while (this.incomingPacketQueue.length > 0) {
                const packet = this.incomingPacketQueue.shift();

                // handle the packet
                // Process the packet based on its content
                this.handlePacket(packet);
                this.trigger('packet', packet);
            }
        }, 16); // ~60fps
        
        // Process outgoing packets
        setInterval(() => {
            const currentTime = Date.now();
            
            // Only send packets at the specified interval
            if (currentTime - this.lastPacketSentTime >= this.outgoingPacketInterval) {
                // Get all currently queued messages
                const packetsToSend = [...this.outgoingPacketQueue];
                this.outgoingPacketQueue = [];
                
                if (packetsToSend.length > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
                    packetsToSend.forEach(packet => {
                        try {
                            if (typeof packet === 'string') {
                                this.sendString(packet);
                            } else {
                                // For objects, serialize with msgpack
                                const serialized = msgpack.encode(packet);
                                this.socket.send(serialized);
                            }
                        } catch (error) {
                            this.log.error(`Error sending packet: ${error.message}`);
                        }
                    });
                    
                    this.lastPacketSentTime = currentTime;
                }
            }
        }, 10); // Check outgoing queue every 10ms
    }
    
    /**
     * Set input key state (PRESSED, RELEASED, ACTIVE, INACTIVE)
     */
    setInputKeyState(key, state) {
        const input = {};
        input[key] = state;
        this.packInputMessages(input);
    }
}

// Export the network client
window.StellarNetworkClient = StellarNetworkClient; 