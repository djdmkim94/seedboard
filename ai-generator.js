/**
 * AI Content Generator
 * Uses Claude API (via proxy server) to generate TikTok content
 */

const AIGenerator = {
    // API endpoint (local proxy server)
    API_ENDPOINT: '/api/generate',
    STORAGE_KEY: 'seedboard_api_key',

    /**
     * Get stored API key from localStorage
     */
    getApiKey() {
        return localStorage.getItem(this.STORAGE_KEY) || '';
    },

    /**
     * Save API key to localStorage
     */
    setApiKey(key) {
        if (key) {
            localStorage.setItem(this.STORAGE_KEY, key.trim());
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    },

    /**
     * Check if an API key is available
     */
    hasApiKey() {
        return !!this.getApiKey();
    },

    /**
     * Generate content from a summary
     * @param {string} summary - The content summary/idea
     * @returns {Promise<{header: string, caption: string, hashtags: string[]}>}
     */
    async generate(summary) {
        if (!summary || summary.trim().length === 0) {
            throw new Error('Summary is required');
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API_KEY_REQUIRED');
        }

        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ summary: summary.trim(), apiKey }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate content');
            }

            const data = await response.json();
            return {
                header: data.header || '',
                caption: data.caption || '',
                hashtags: data.hashtags || [],
            };
        } catch (error) {
            console.error('AI Generation error:', error);
            throw error;
        }
    },

    /**
     * Format hashtags array as a string
     * @param {string[]} hashtags - Array of hashtags
     * @returns {string} - Formatted hashtag string
     */
    formatHashtags(hashtags) {
        if (!Array.isArray(hashtags)) {
            return hashtags || '';
        }
        return hashtags.map(tag => {
            tag = tag.trim();
            return tag.startsWith('#') ? tag : `#${tag}`;
        }).join(' ');
    },

    /**
     * Parse hashtag string into array
     * @param {string} hashtagString - Space or comma separated hashtags
     * @returns {string[]} - Array of hashtags
     */
    parseHashtags(hashtagString) {
        if (!hashtagString) return [];
        return hashtagString
            .split(/[\s,]+/)
            .filter(tag => tag.length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
    },
};

// Export for use in other files
window.AIGenerator = AIGenerator;
