/**
 * Main entry point for AsTeRICS-Grid Android
 */

import { createLogger } from './util/Logger';
import { errorHandler } from './util/ErrorHandler';
import { performanceMonitor } from './util/PerformanceMonitor';

const logger = createLogger('Main');

// Initialize app
async function initializeApp() {
    try {
        logger.info('AsTeRICS-Grid Android initializing...');
        
        // Performance mark
        performanceMonitor.mark('app-init');
        
        // Check Capacitor
        if (window.Capacitor) {
            logger.info('Running in Capacitor', {
                platform: window.Capacitor.getPlatform()
            });
        }
        
        // TODO: Initialize AsTeRICS-Grid here
        // For now just show ready message
        document.getElementById('app').innerHTML = `
            <div style="padding: 20px; font-family: Arial;">
                <h1>✅ AsTeRICS-Grid Android</h1>
                <p>App initialized successfully!</p>
                <p>Ready for AsTeRICS-Grid integration.</p>
            </div>
        `;
        
        performanceMonitor.measure('app-init', 'app-init');
        logger.info('App initialized');
        
    } catch (error) {
        errorHandler.handleError(error, {
            context: 'App initialization',
            severity: 'CRITICAL'
        });
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
