/**
 * AI Content Generator
 * Uses Claude API (via proxy server) to generate TikTok content
 */

const AIGenerator = {
    // API endpoint (local proxy server)
    API_ENDPOINT: '/api/generate',

    /**
     * Generate content from a summary
     * @param {string} summary - The content summary/idea
     * @returns {Promise<{header: string, caption: string, hashtags: string[]}>}
     */
    async generate(summary) {
        if (!summary || summary.trim().length === 0) {
            throw new Error('Summary is required');
        }

        try {
            const response = await fetch(this.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ summary: summary.trim() }),
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
