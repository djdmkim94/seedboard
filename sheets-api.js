/**
 * Google Sheets API Integration
 * Handles authentication and CRUD operations for content data
 */

const SheetsAPI = {
    // Configuration - User needs to set these
    CLIENT_ID: null,
    SPREADSHEET_ID: null,
    SHEET_NAME: 'Content',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',

    // State
    isInitialized: false,
    isSignedIn: false,
    tokenClient: null,

    /**
     * Initialize the Google API client
     */
    async init(clientId, spreadsheetId) {
        this.CLIENT_ID = clientId;
        this.SPREADSHEET_ID = spreadsheetId;

        return new Promise((resolve, reject) => {
            // Load the Google API client
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                    });

                    // Initialize Google Identity Services
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: this.SCOPES,
                        callback: (response) => {
                            if (response.error) {
                                reject(response);
                                return;
                            }
                            this.isSignedIn = true;
                            resolve(response);
                        },
                    });

                    this.isInitialized = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    },

    /**
     * Request user authorization
     */
    async authorize() {
        if (!this.isInitialized) {
            throw new Error('SheetsAPI not initialized. Call init() first.');
        }

        return new Promise((resolve, reject) => {
            try {
                // Check if we have a valid token
                if (gapi.client.getToken() === null) {
                    // Request new token
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    // Use existing token
                    this.isSignedIn = true;
                    resolve();
                }

                // Set up callback to resolve when authorized
                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        reject(response);
                        return;
                    }
                    this.isSignedIn = true;
                    resolve(response);
                };
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Sign out
     */
    signOut() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            this.isSignedIn = false;
        }
    },

    /**
     * Load all content from the spreadsheet
     */
    async loadContent() {
        if (!this.isSignedIn) {
            throw new Error('Not signed in');
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A2:I`,
            });

            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0] || '',
                title: row[1] || '',
                summary: row[2] || '',
                header: row[3] || '',
                caption: row[4] || '',
                hashtags: row[5] || '',
                status: row[6] || 'idea',
                dueDate: row[7] || '',
                createdDate: row[8] || '',
            }));
        } catch (error) {
            console.error('Error loading content:', error);
            throw error;
        }
    },

    /**
     * Add new content to the spreadsheet
     */
    async addContent(content) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in');
        }

        const id = Date.now().toString();
        const createdDate = new Date().toISOString().split('T')[0];

        const row = [
            id,
            content.title,
            content.summary || '',
            content.header || '',
            content.caption || '',
            content.hashtags || '',
            content.status || 'idea',
            content.dueDate || '',
            createdDate,
        ];

        try {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A:I`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [row],
                },
            });

            return { ...content, id, createdDate };
        } catch (error) {
            console.error('Error adding content:', error);
            throw error;
        }
    },

    /**
     * Update existing content in the spreadsheet
     */
    async updateContent(content) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in');
        }

        try {
            // First, find the row with this ID
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A:A`,
            });

            const ids = response.result.values || [];
            let rowIndex = -1;

            for (let i = 0; i < ids.length; i++) {
                if (ids[i][0] === content.id) {
                    rowIndex = i + 1; // +1 because sheets are 1-indexed
                    break;
                }
            }

            if (rowIndex === -1) {
                throw new Error('Content not found');
            }

            const row = [
                content.id,
                content.title,
                content.summary || '',
                content.header || '',
                content.caption || '',
                content.hashtags || '',
                content.status || 'idea',
                content.dueDate || '',
                content.createdDate || '',
            ];

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A${rowIndex}:I${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [row],
                },
            });

            return content;
        } catch (error) {
            console.error('Error updating content:', error);
            throw error;
        }
    },

    /**
     * Delete content from the spreadsheet
     */
    async deleteContent(id) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in');
        }

        try {
            // First, find the row with this ID
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A:A`,
            });

            const ids = response.result.values || [];
            let rowIndex = -1;

            for (let i = 0; i < ids.length; i++) {
                if (ids[i][0] === id) {
                    rowIndex = i; // 0-indexed for delete request
                    break;
                }
            }

            if (rowIndex === -1) {
                throw new Error('Content not found');
            }

            // Get the sheet ID
            const sheetMetadata = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: this.SPREADSHEET_ID,
            });

            const sheet = sheetMetadata.result.sheets.find(
                s => s.properties.title === this.SHEET_NAME
            );

            if (!sheet) {
                throw new Error('Sheet not found');
            }

            // Delete the row
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.SPREADSHEET_ID,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1,
                            },
                        },
                    }],
                },
            });

            return true;
        } catch (error) {
            console.error('Error deleting content:', error);
            throw error;
        }
    },

    /**
     * Initialize the spreadsheet with headers if empty
     */
    async initializeSheet() {
        if (!this.isSignedIn) {
            throw new Error('Not signed in');
        }

        try {
            // Check if headers exist
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `${this.SHEET_NAME}!A1:I1`,
            });

            const headers = response.result.values?.[0];

            if (!headers || headers.length === 0) {
                // Add headers
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.SPREADSHEET_ID,
                    range: `${this.SHEET_NAME}!A1:I1`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [['ID', 'Title', 'Summary', 'Header', 'Caption', 'Hashtags', 'Status', 'Due Date', 'Created Date']],
                    },
                });
            }

            return true;
        } catch (error) {
            // If sheet doesn't exist, try to create it
            if (error.result?.error?.status === 'INVALID_ARGUMENT') {
                console.log('Sheet might not exist, attempting to use default sheet name');
            }
            throw error;
        }
    },
};

// Export for use in other files
window.SheetsAPI = SheetsAPI;
