/**
 * Stellar Light Client - Main Application
 * 
 * This file handles the user interface and interaction with the
 * networking module.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the client
    const client = new StellarNetworkClient();
    
    // Get UI elements
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');
    const userIdInput = document.getElementById('user-id');
    const ipAddressDisplay = document.getElementById('user-address');
    
    // Generate random user ID if empty
    if (!userIdInput.value) {
        userIdInput.value = 'user_' + Math.random().toString(36).substring(2, 10);
    }
    
    // Set up event listeners
    connectBtn.addEventListener('click', function() {
        const host = hostInput.value || 'localhost';
        const port = portInput.value || '8765';
        const userId = userIdInput.value;
        
        if (!userId) {
            client.log.error('User ID is required');
            return;
        }
        
        client.connect(host, port, userId);
    });
    
    disconnectBtn.addEventListener('click', function() {
        client.disconnect();
    });
    
    sendBtn.addEventListener('click', function() {
        sendMessage();
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // // Handle packet reception
    // client.on('packet', function(packet) {
        
    //     if (packet && packet.delta) {
    //         // Display delta info
    //         client.log.info(`Received delta with ${Object.keys(packet.delta).length} cells`);
            
    //         // Handle render pixels if available
    //         if (packet.delta.replace && packet.delta.replace.data) {
    //             const renderData = {
    //                 data: packet.delta.replace.data,
    //                 width: packet.delta.replace.width || 0,
    //                 height: packet.delta.replace.height || 0,
    //                 format: packet.delta.replace.format
    //             };
                
    //             client.log.info(`Received render pixels: ${renderData.width}x${renderData.height} (${renderData.format})`);
                
    //             // You can now use the render data - for example to draw on a canvas
    //             updateGameDisplay(renderData);
    //         }
    //     }
    //     // Handle specific packet types
    //     if (packet && packet.field_window) {
    //         // Display field window info
    //         client.log.info(`Received field window with ${Object.keys(packet.field_window).length} cells`);
    //     }
        
    //     if (packet && packet.net_events) {
    //         // Display net events
    //         packet.net_events.forEach(event => {
    //             client.log.info(`Net event: ${event.type}`);
    //         });
    //     }
    // });
    
    // Handle authentication and IP address
    client.on('authenticated', function() {
        // Enable sending messages after authentication
        sendBtn.disabled = false;
        
        // Display the IP address if available
        if (client.myIp) {
            ipAddressDisplay.textContent = client.myIp;
            client.log.info(`Your IP address: ${client.myIp}`);
        }
        
        // Send a test network event
        client.sendNetEvent('client_ready', { version: '1.0', platform: 'web' });
    });
    
    // Add a specific handler for IP address updates
    client.on('ip_received', function(ip) {
        if (ipAddressDisplay) {
            ipAddressDisplay.textContent = ip;
        }
        client.log.info(`Your IP address: ${ip}`);
    });

    client.on('render_pixels', function(renderPixels, width, height) {
        client.log.info(`Received render pixels: ${renderPixels}`);
        updateGameDisplay(renderPixels, width, height);

    });
    
    // Function to send a message
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        try {
            // Try to parse as JSON
            let jsonObj;
            try {
                jsonObj = JSON.parse(text);
                // If it's valid JSON, send it as an object
                client.sendPacket(jsonObj);
                client.log.info(`Sent JSON packet: ${text}`);
            } catch (e) {
                // Not JSON, send as text command
                const commandMsg = {
                    commands: [{ key: 'command', body: text }]
                };
                client.sendPacket(commandMsg);
                client.log.info(`Sent command: ${text}`);
            }
            
            // Clear input
            messageInput.value = '';
        } catch (error) {
            client.log.error(`Error sending message: ${error.message}`);
        }
    }
    
    // Handle keyboard input for movement
    document.addEventListener('keydown', function(e) {
        if (!client.connected || client.state !== HandshakingState.AUTHENTICATED) {
            return;
        }
        
        // Only handle key events when not typing in the message input
        if (document.activeElement === messageInput) {
            return;
        }
        
        switch (e.key.toUpperCase()) {
            case 'W':
                client.setInputKeyState('W', client.PRESSED);
                break;
            case 'A':
                client.setInputKeyState('A', client.PRESSED);
                break;
            case 'S':
                client.setInputKeyState('S', client.PRESSED);
                break;
            case 'D':
                client.setInputKeyState('D', client.PRESSED);
                break;
            case 'Z':
                client.setInputKeyState('Z', client.PRESSED);
                break;
            case 'X':
                client.setInputKeyState('X', client.PRESSED);
                break;
            case ' ':
                client.setInputKeyState('SPACE', client.PRESSED);
                break;
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (!client.connected || client.state !== HandshakingState.AUTHENTICATED) {
            return;
        }
        
        // Only handle key events when not typing in the message input
        if (document.activeElement === messageInput) {
            return;
        }
        
        switch (e.key.toUpperCase()) {
            case 'W':
                client.setInputKeyState('W', client.RELEASED);
                break;
            case 'A':
                client.setInputKeyState('A', client.RELEASED);
                break;
            case 'S':
                client.setInputKeyState('S', client.RELEASED);
                break;
            case 'D':
                client.setInputKeyState('D', client.RELEASED);
                break;
            case 'Z':
                client.setInputKeyState('Z', client.RELEASED);
                break;
            case 'X':
                client.setInputKeyState('X', client.RELEASED);
                break;
            case ' ':
                client.setInputKeyState('SPACE', client.RELEASED);
                break;
        }
    });
    
    // Add a simple welcome message
    client.log.info('Stellar Light Client initialized. Connect to a server to begin.');
    
    // Function to update game display with render pixels
    function updateGameDisplay(render_pixels, width, height) {

        width = width ?? 800;
        height = height ?? 600;
        
        // Get or create the game container
        let gameContainer = document.querySelector('.game-container');
        if (!gameContainer) {
            // Create container if it doesn't exist
            gameContainer = document.createElement('div');
            gameContainer.className = 'game-container';
            
            // Add container after the client display
            const clientDisplay = document.querySelector('.client-display');
            if (clientDisplay && clientDisplay.parentNode) {
                clientDisplay.parentNode.insertBefore(gameContainer, clientDisplay.nextSibling);
            } else {
                document.body.appendChild(gameContainer);
            }
        }
        
        // Get or create the canvas element
        let canvas = document.getElementById('game-canvas');
        if (!canvas) {
            // Create canvas if it doesn't exist
            canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
            canvas.width = width;
            canvas.height = height;
            
            // Add canvas to the game container
            gameContainer.appendChild(canvas);
        }
        
        // // Ensure canvas dimensions match the render data
        // canvas.width = render_pixels.width;
        // canvas.height = render_pixels.height;
        
        // Get the 2D context for drawing
        const ctx = canvas.getContext('2d');

        const buffer = StellarUtils.searchTree(render_pixels, "buffer");
        if (buffer != undefined) {
            // Add debug info to check buffer
            client.log.info(`Buffer found: Length=${buffer.length || buffer.byteLength}, Type=${buffer.constructor.name}`);
            
            // Convert from ARGB to RGBA format
            const length = buffer.byteLength || buffer.length || (width * height * 4);
            const converted = new Uint8ClampedArray(length);
            
            // Ensure we're accessing the buffer correctly
            const bufferArray = new Uint8Array(buffer.buffer || buffer);
            
            // Check if we have data or just zeroes
            let hasNonZeroValue = false;
            for (let i = 0; i < Math.min(100, bufferArray.length); i++) {
                if (bufferArray[i] > 0) {
                    hasNonZeroValue = true;
                    break;
                }
            }
            client.log.info(`Buffer has non-zero values: ${hasNonZeroValue}`);
            
            for (let i = 0; i < length; i += 4) {
                // ABGR (buffer) to RGBA (converted)
                converted[i] = bufferArray[i + 3];     // A
                converted[i + 1] = bufferArray[i + 2]; // B
                converted[i + 2] = bufferArray[i + 1]; // G
                converted[i + 3] = bufferArray[i];     // R
            }
            
            client.log.info(`Canvas dimensions: ${canvas.width}x${canvas.height}, Expected: ${width}x${height}`);
            
            // Ensure canvas dimensions match the buffer dimensions
            canvas.width = width;
            canvas.height = height;
            
            const imageData = new ImageData(
                converted,
                width,
                height
            );

            // Draw the image data to the canvas
            ctx.putImageData(imageData, 0, 0);
        } else {
            client.log.error("No buffer found in render_pixels data");
        }
        
        // Create an ImageData object from the render data
        // const imageData = new ImageData(
        //     new Uint8ClampedArray(render_pixels.data),
        //     render_pixels.width,
        //     render_pixels.height
        // );
        

        
        // Log success
        client.log.info(`Updated game display: ${canvas.width}x${canvas.height}`);
    }

    // Save and load persisted form values
    const persistedFields = document.querySelectorAll('[data-persist="true"]');
    persistedFields.forEach(field => {
        const savedValue = localStorage.getItem(`stellar-light-${field.id}`);
        if (savedValue) {
            field.value = savedValue;
        }
    });
    
    persistedFields.forEach(field => {
        field.addEventListener('change', function() {
            localStorage.setItem(`stellar-light-${field.id}`, this.value);
        });
    });

    // Hide connection panel when connected, show it when disconnected
    function updateConnectionPanelVisibility(isConnected) {
        const connectionPanel = document.querySelector('.connection-panel');
        if (isConnected) {
            connectionPanel.classList.add('hidden');
        } else {
            connectionPanel.classList.remove('hidden');
        }
    }

    // Function to hide panels
    function hidePanels() {
        const connectionPanel = document.querySelector('.connection-panel');
        const logContainer = document.querySelector('.log-container');
        const inputContainer = document.querySelector('.input-container');
        const panelToggleBtn = document.getElementById('panel-toggle-btn');
        
        // Hide panels
        connectionPanel.classList.add('hidden');
        logContainer.classList.add('hidden');
        inputContainer.classList.add('hidden');
        
        // Update button text
        panelToggleBtn.textContent = 'show panel';
    }

    // Function to show panels
    function showPanels() {
        const connectionPanel = document.querySelector('.connection-panel');
        const logContainer = document.querySelector('.log-container');
        const inputContainer = document.querySelector('.input-container');
        const panelToggleBtn = document.getElementById('panel-toggle-btn');
        
        // Show panels
        connectionPanel.classList.remove('hidden');
        logContainer.classList.remove('hidden');
        inputContainer.classList.remove('hidden');
        
        // Update button text
        panelToggleBtn.textContent = 'hide panel';
    }

    // Initialize panel toggle button
    const panelToggleBtn = document.getElementById('panel-toggle-btn');
    
    panelToggleBtn.addEventListener('click', function() {
        // Toggle visibility of panels
        const connectionPanel = document.querySelector('.connection-panel');
        const isPanelVisible = !connectionPanel.classList.contains('hidden');
        
        if (isPanelVisible) {
            hidePanels();
        } else {
            showPanels();
        }
    });

    // Add panel hiding to connect button
    document.getElementById('connect-btn').addEventListener('click', function() {
        // Hide panels when connect is clicked
        hidePanels();
    });

    document.getElementById('disconnect-btn').addEventListener('click', function() {
        // ... existing disconnection code ...
        
        // Show panel after disconnection
        updateConnectionPanelVisibility(false);
        document.getElementById('connection-status').textContent = 'Disconnected';
    });

    // Game controller setup
    const controlButtons = document.querySelectorAll('.control-btn');
    
    // Button press handlers
    controlButtons.forEach(button => {
        button.addEventListener('mousedown', function() {
            const buttonId = this.id;
            handleButtonPress(buttonId, true);
        });
        
        button.addEventListener('mouseup', function() {
            const buttonId = this.id;
            handleButtonPress(buttonId, false);
        });
        
        // Add touch support for mobile
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const buttonId = this.id;
            handleButtonPress(buttonId, true);
        });
        
        button.addEventListener('touchend', function(e) {
            e.preventDefault();
            const buttonId = this.id;
            handleButtonPress(buttonId, false);
        });
    });
    
    // Function to handle button press/release
    function handleButtonPress(buttonId, isDown) {
        console.log(`Button ${isDown ? 'pressed' : 'released'}: ${buttonId}`);
        
        // Map button IDs to keyboard keys
        let key = '';
        
        if (buttonId === 'btn-w') {
            key = 'w';
        } else if (buttonId === 'btn-a') {
            key = 'a';
        } else if (buttonId === 'btn-s') {
            key = 's';
        } else if (buttonId === 'btn-d') {
            key = 'd';
        } else if (buttonId === 'btn-action-a') {
            // For action buttons, you could map to different keys like 'j' or 'z'
            key = 'j';
        } else if (buttonId === 'btn-action-b') {
            key = 'k';
        }
        
        if (key) {
            // Create and dispatch keyboard event
            const eventType = isDown ? 'keydown' : 'keyup';
            
            // Create the event with the appropriate key
            const event = new KeyboardEvent(eventType, {
                key: key,
                code: `Key${key.toUpperCase()}`,
                keyCode: key.charCodeAt(0),
                which: key.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });
            
            // Dispatch the event
            document.dispatchEvent(event);
        }
    }
}); 