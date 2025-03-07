/**
 * Stellar Light Client - Utilities Module
 * 
 * This module provides utility functions used across the application.
 */

/**
 * Recursively searches through a nested object structure for a specific key
 * 
 * @param {Object} tree - The object to search through
 * @param {string} searchKey - The key to look for
 * @returns {*} The value of the key if found, undefined otherwise
 */
function searchTree(tree, searchKey) {
    // Base case: if tree is not an object or is null
    if (!tree || typeof tree !== 'object') {
        return undefined;
    }
    
    // Check if the current level has the key we're looking for
    if (searchKey in tree) {
        return tree[searchKey];
    }
    
    // Recursively search through all properties
    for (const key in tree) {
        if (typeof tree[key] === 'object') {
            const result = searchTree(tree[key], searchKey);
            if (result !== undefined) {
                return result;
            }
        }
    }
    
    // Not found in this branch
    return undefined;
}

// Make utilities available to other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        searchTree
    };
} else {
    // Browser environment
    window.StellarUtils = {
        searchTree
    };
} 