/**
 * TikTok Content Dashboard - Main Application
 */

const App = {
    // State
    content: [],
    currentEditId: null,
    isConnected: true,
    selectedLibraryId: null,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),

    /**
     * Initialize the application
     */
    async init() {
        this.bindEvents();
        this.bindGardenFilters();
        this.restoreCrop();
        await this.loadContent();
        Carousel.init(this.content);
        this.updateConnectionStatus(true);
        this.renderContent();
        this.updateReminders();
        this.renderGarden();
        await this.loadAccounts();
        await this.loadAnalytics();
    },

    /**
     * Load content from local API
     */
    async loadContent() {
        try {
            const response = await fetch('/api/content');
            this.content = await response.json();
        } catch (error) {
            console.error('Error loading content:', error);
            this.content = [];
        }
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        document.getElementById('syncBtn').addEventListener('click', () => this.syncMetrics());
        document.getElementById('getInsightsBtn').addEventListener('click', () => this.getAIInsights());

        // Add content button
        document.getElementById('addContentBtn').addEventListener('click', () => this.openAddModal());

        // Content form submission
        document.getElementById('contentForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Modal close buttons
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeViewModal').addEventListener('click', () => this.closeViewModal());
        document.getElementById('closeViewBtn').addEventListener('click', () => this.closeViewModal());
        document.getElementById('editFromView').addEventListener('click', () => this.editFromView());

        // AI Generation
        document.getElementById('generateBtn').addEventListener('click', () => this.generateContent());
        document.getElementById('useGeneratedBtn').addEventListener('click', () => this.useGeneratedContent());

        // Copy buttons (generator)
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => this.copyToClipboard(e.target.dataset.target));
        });

        // Library context clear
        document.getElementById('clearContext').addEventListener('click', () => this.clearLibrarySelection());

        // Send to publish
        document.getElementById('sendToPublishBtn').addEventListener('click', () => this.sendToPublish());

        // Publish copy buttons
        document.getElementById('copyPublishCaption').addEventListener('click', () => this.copyPublishText('publishCaption'));
        document.getElementById('copyPublishHashtags').addEventListener('click', () => this.copyPublishText('publishHashtags'));

        // Filters + sort
        document.getElementById('sortFilter').addEventListener('change', () => this.renderContent());
        document.getElementById('statusFilter').addEventListener('change', () => this.renderContent());
        document.getElementById('searchFilter').addEventListener('input', () => this.renderContent());

        // CSV Import modal
        document.getElementById('importCsvBtn').addEventListener('click', () => this.openCsvImport());
        document.getElementById('closeCsvImport').addEventListener('click', () => this.closeCsvImport());
        document.getElementById('csvImportModal').addEventListener('click', (e) => {
            if (e.target.id === 'csvImportModal') this.closeCsvImport();
        });
        document.getElementById('csvBack').addEventListener('click', () => this.csvShowStep(1));
        document.getElementById('csvConfirmImport').addEventListener('click', () => this.csvDoImport());
        document.getElementById('downloadTemplateBtn').addEventListener('click', () => this.csvDownloadTemplate());

        const dropZone = document.getElementById('csvDropZone');
        const fileInput = document.getElementById('csvFileInput');
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.csvReadFile(e.target.files[0]);
        });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) this.csvReadFile(e.dataTransfer.files[0]);
        });

        // Crop Picker modal
        document.getElementById('cropPickerBtn').addEventListener('click', () => this.openCropPicker());
        document.getElementById('closeCropPicker').addEventListener('click', () => this.closeCropPicker());
        document.getElementById('cancelCropPicker').addEventListener('click', () => this.closeCropPicker());
        document.getElementById('confirmCropPicker').addEventListener('click', () => this.confirmCrop());
        document.getElementById('cropPickerModal').addEventListener('click', (e) => {
            if (e.target.id === 'cropPickerModal') this.closeCropPicker();
        });
        document.getElementById('cropGrid').addEventListener('click', (e) => {
            const btn = e.target.closest('.crop-option');
            if (!btn) return;
            document.querySelectorAll('.crop-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });

        // Calendar modal
        document.getElementById('calendarBtn').addEventListener('click', () => this.openCalendarModal());
        document.getElementById('closeCalModal').addEventListener('click', () => this.closeCalendarModal());
        document.getElementById('calPrevMonth').addEventListener('click', () => {
            this.calYear = this.calMonth === 0 ? this.calYear - 1 : this.calYear;
            this.calMonth = this.calMonth === 0 ? 11 : this.calMonth - 1;
            this.renderCalendar();
        });
        document.getElementById('calNextMonth').addEventListener('click', () => {
            this.calYear = this.calMonth === 11 ? this.calYear + 1 : this.calYear;
            this.calMonth = this.calMonth === 11 ? 0 : this.calMonth + 1;
            this.renderCalendar();
        });
        document.getElementById('calendarModal').addEventListener('click', (e) => {
            if (e.target.id === 'calendarModal') this.closeCalendarModal();
        });

        // Show stats section when status is "posted"
        document.getElementById('contentStatus').addEventListener('change', (e) => {
            const statsSection = document.getElementById('statsSection');
            if (e.target.value === 'posted') {
                statsSection.classList.remove('hidden');
            }
        });

        // Show stats section when TikTok URL is entered
        document.getElementById('contentTiktokUrl').addEventListener('input', (e) => {
            const statsSection = document.getElementById('statsSection');
            if (e.target.value.trim()) {
                statsSection.classList.remove('hidden');
            }
        });

        // Click outside modal to close
        document.getElementById('contentModal').addEventListener('click', (e) => {
            if (e.target.id === 'contentModal') this.closeModal();
        });
        document.getElementById('viewModal').addEventListener('click', (e) => {
            if (e.target.id === 'viewModal') this.closeViewModal();
        });
    },

    /**
     * Update connection status display
     */
    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        status.textContent = 'Local Storage';
        status.className = 'status connected';
    },

    /**
     * Open modal for adding new content
     */
    openAddModal() {
        this.currentEditId = null;
        document.getElementById('modalTitle').textContent = 'Add New Content';
        document.getElementById('contentForm').reset();
        document.getElementById('contentId').value = '';
        document.getElementById('statsSection').classList.add('hidden');
        document.getElementById('contentModal').classList.remove('hidden');
    },

    /**
     * Open modal for editing content
     */
    openEditModal(id) {
        const item = this.content.find(c => c.id === id);
        if (!item) return;

        this.currentEditId = id;
        document.getElementById('modalTitle').textContent = 'Edit Content';
        document.getElementById('contentId').value = item.id;
        document.getElementById('contentTitle').value = item.title;
        document.getElementById('contentSummary').value = item.summary;
        document.getElementById('contentHeader').value = item.header;
        document.getElementById('contentCaption').value = item.caption;
        document.getElementById('contentHashtags').value = item.hashtags;
        document.getElementById('contentStatus').value = item.status;
        document.getElementById('contentDueDate').value = item.dueDate;
        document.getElementById('contentCategory').value = item.category || '';
        document.getElementById('contentTiktokUrl').value = item.tiktokUrl || '';
        document.getElementById('contentViews').value = item.views || '';
        document.getElementById('contentLikes').value = item.likes || '';
        document.getElementById('contentComments').value = item.comments || '';
        document.getElementById('contentShares').value = item.shares || '';

        // Show stats section if status is posted
        const statsSection = document.getElementById('statsSection');
        if (item.status === 'posted' || item.tiktokUrl) {
            statsSection.classList.remove('hidden');
        } else {
            statsSection.classList.add('hidden');
        }

        document.getElementById('contentModal').classList.remove('hidden');
    },

    /**
     * Close the add/edit modal
     */
    closeModal() {
        document.getElementById('contentModal').classList.add('hidden');
        this.currentEditId = null;
    },

    /**
     * Open view modal
     */
    openViewModal(id) {
        const item = this.content.find(c => c.id === id);
        if (!item) return;

        this.currentEditId = id;
        document.getElementById('viewModalTitle').textContent = item.title;
        document.getElementById('viewSummary').textContent = item.summary || '-';
        document.getElementById('viewHeader').textContent = item.header || '-';
        document.getElementById('viewCaption').textContent = item.caption || '-';
        document.getElementById('viewHashtags').textContent = item.hashtags || '-';
        document.getElementById('viewStatus').innerHTML = `<span class="status-badge ${item.status}">${item.status.replace('-', ' ')}</span>`;
        document.getElementById('viewDueDate').textContent = item.dueDate ? this.formatDate(item.dueDate) : '-';

        // TikTok URL
        const urlSection = document.getElementById('viewTiktokUrlSection');
        const urlEl = document.getElementById('viewTiktokUrl');
        if (item.tiktokUrl) {
            urlEl.innerHTML = `<a href="${this.escapeHtml(item.tiktokUrl)}" target="_blank">${this.escapeHtml(item.tiktokUrl)}</a>`;
            urlSection.style.display = 'block';
        } else {
            urlSection.style.display = 'none';
        }

        // Stats
        const statsSection = document.getElementById('viewStatsSection');
        if (item.status === 'posted' || item.views || item.likes) {
            document.getElementById('viewViews').textContent = this.formatNumber(item.views || 0);
            document.getElementById('viewLikes').textContent = this.formatNumber(item.likes || 0);
            document.getElementById('viewComments').textContent = this.formatNumber(item.comments || 0);
            document.getElementById('viewShares').textContent = this.formatNumber(item.shares || 0);
            statsSection.style.display = 'block';
        } else {
            statsSection.style.display = 'none';
        }

        document.getElementById('viewModal').classList.remove('hidden');
    },

    /**
     * Close view modal
     */
    closeViewModal() {
        document.getElementById('viewModal').classList.add('hidden');
    },

    /**
     * Edit from view modal
     */
    editFromView() {
        this.closeViewModal();
        if (this.currentEditId) {
            this.openEditModal(this.currentEditId);
        }
    },

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('contentTitle').value,
            summary: document.getElementById('contentSummary').value,
            header: document.getElementById('contentHeader').value,
            caption: document.getElementById('contentCaption').value,
            hashtags: document.getElementById('contentHashtags').value,
            category: document.getElementById('contentCategory').value,
            status: document.getElementById('contentStatus').value,
            dueDate: document.getElementById('contentDueDate').value,
            tiktokUrl: document.getElementById('contentTiktokUrl').value,
            views: parseInt(document.getElementById('contentViews').value) || 0,
            likes: parseInt(document.getElementById('contentLikes').value) || 0,
            comments: parseInt(document.getElementById('contentComments').value) || 0,
            shares: parseInt(document.getElementById('contentShares').value) || 0,
        };

        const existingId = document.getElementById('contentId').value;

        try {
            this.showLoading('Saving...');

            if (existingId) {
                // Update existing
                const response = await fetch(`/api/content/${existingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                const updated = await response.json();
                const index = this.content.findIndex(c => c.id === existingId);
                if (index !== -1) {
                    this.content[index] = updated;
                }
            } else {
                // Add new
                const response = await fetch('/api/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                const newContent = await response.json();
                this.content.push(newContent);
            }

            this.hideLoading();
            this.showToast('Content saved!', 'success');
            this.closeModal();
            this.renderContent();
            this.updateReminders();
            this.renderGarden();
            Carousel.refresh(this.content);
        } catch (error) {
            this.hideLoading();
            this.showToast('Error saving: ' + error.message, 'error');
        }
    },

    /**
     * Delete content
     */
    async deleteContent(id) {
        if (!confirm('Are you sure you want to delete this content?')) {
            return;
        }

        try {
            this.showLoading('Deleting...');
            await fetch(`/api/content/${id}`, { method: 'DELETE' });
            this.content = this.content.filter(c => c.id !== id);
            this.hideLoading();
            this.renderContent();
            this.updateReminders();
            this.renderGarden();
            Carousel.refresh(this.content);
            this.showToast('Content deleted', 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('Error deleting: ' + error.message, 'error');
        }
    },

    /**
     * Generate AI content
     */
    async generateContent() {
        const summary = document.getElementById('aiSummary').value;

        if (!summary.trim()) {
            this.showToast('Please enter a content summary', 'error');
            return;
        }

        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="icon">⏳</span> Generating...';

        try {
            const result = await AIGenerator.generate(summary);

            document.getElementById('generatedHeader').textContent = result.header;
            document.getElementById('generatedCaption').textContent = result.caption;
            document.getElementById('generatedHashtags').textContent = AIGenerator.formatHashtags(result.hashtags);

            document.getElementById('aiResults').classList.remove('hidden');
            this.showToast('Content generated!', 'success');
        } catch (error) {
            this.showToast('Generation failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="icon">✨</span> Generate Content';
        }
    },

    /**
     * Save generated content — into selected library item if one is active, else open new modal
     */
    useGeneratedContent() {
        const header = document.getElementById('generatedHeader').textContent;
        const caption = document.getElementById('generatedCaption').textContent;
        const hashtags = document.getElementById('generatedHashtags').textContent;
        const summary = document.getElementById('aiSummary').value;

        if (this.selectedLibraryId) {
            // Pre-fill edit modal for the selected item
            this.openEditModal(this.selectedLibraryId);
            document.getElementById('contentHeader').value = header;
            document.getElementById('contentCaption').value = caption;
            document.getElementById('contentHashtags').value = hashtags;
            this.showToast('Generated content loaded into item — save to keep it', 'success');
        } else {
            this.openAddModal();
            document.getElementById('contentSummary').value = summary;
            document.getElementById('contentHeader').value = header;
            document.getElementById('contentCaption').value = caption;
            document.getElementById('contentHashtags').value = hashtags;
        }
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(targetId) {
        const text = document.getElementById(targetId).textContent;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (error) {
            this.showToast('Failed to copy', 'error');
        }
    },

    /**
     * Render content as library checklist cards
     */
    renderContent() {
        const list = document.getElementById('libraryList');
        const statusFilter = document.getElementById('statusFilter').value;
        const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

        const sortMode = document.getElementById('sortFilter').value;

        let filtered = this.content;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter);
        }
        if (searchFilter) {
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(searchFilter) ||
                c.summary?.toLowerCase().includes(searchFilter)
            );
        }

        const now = new Date(); now.setHours(0, 0, 0, 0);
        const statusOrder = { 'idea': 0, 'in-progress': 1, 'filmed': 2, 'edited': 3, 'posted': 4 };

        filtered.sort((a, b) => {
            if (sortMode === 'due-date') {
                if (a.dueDate && b.dueDate) return new Date(b.dueDate) - new Date(a.dueDate);
                if (a.dueDate) return 1;
                if (b.dueDate) return -1;
                return 0;
            }
            if (sortMode === 'status') {
                return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
            }
            if (sortMode === 'newest') {
                return new Date(b.createdDate) - new Date(a.createdDate);
            }
            if (sortMode === 'performance') {
                const engA = a.views > 0 ? ((a.likes || 0) + (a.comments || 0) + (a.shares || 0)) / a.views : -1;
                const engB = b.views > 0 ? ((b.likes || 0) + (b.comments || 0) + (b.shares || 0)) / b.views : -1;
                return engB - engA;
            }
            // Default: priority — overdue → due soon → upcoming → no date → posted
            const urgency = (item) => {
                if (item.status === 'posted') return 5;
                if (!item.dueDate) return 4;
                const d = new Date(item.dueDate); d.setHours(0, 0, 0, 0);
                const diff = (d - now) / 86400000;
                if (diff < 0) return 0;   // overdue
                if (diff <= 2) return 1;  // due very soon
                if (diff <= 7) return 2;  // this week
                return 3;                  // future
            };
            const ua = urgency(a), ub = urgency(b);
            if (ua !== ub) return ua - ub;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            return 0;
        });

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state">${this.content.length === 0 ? 'Add your first idea!' : 'No matches found.'}</div>`;
            return;
        }

        list.innerHTML = filtered.map(item => `
            <div class="library-card ${this.selectedLibraryId === item.id ? 'selected' : ''}"
                 data-id="${item.id}"
                 onclick="App.selectLibraryItem('${item.id}')">
                <span class="growth-icon">${{'idea':'🌰','in-progress':'🌱','filmed':'🌿','edited':'🌿','posted':'🥕'}[item.status] || '🌰'}</span>
                <div class="library-card-info">
                    <div class="library-card-title">${this.escapeHtml(item.title)}</div>
                    <div class="library-card-meta">
                        <span class="status-badge ${item.status}">${item.status.replace('-', ' ')}</span>
                        ${item.category ? `<span class="library-card-type">${item.category}</span>` : ''}
                        ${item.dueDate ? `<span class="library-card-due">${this.formatDate(item.dueDate)}</span>` : ''}
                    </div>
                </div>
                <div class="library-card-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="App.openEditModal('${item.id}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="App.deleteContent('${item.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Select a library item to use as AI generator context
     */
    selectLibraryItem(id) {
        const item = this.content.find(c => c.id === id);
        if (!item) return;

        this.selectedLibraryId = id;
        this.renderContent();

        // Pre-fill generator
        const summary = [item.summary, item.title].filter(Boolean).join(' — ');
        document.getElementById('aiSummary').value = summary;
        document.getElementById('contextTitle').textContent = item.title;
        document.getElementById('selectedContext').classList.remove('hidden');

        // Clear old results so they regenerate fresh
        document.getElementById('aiResults').classList.add('hidden');
    },

    /**
     * Clear library selection
     */
    clearLibrarySelection() {
        this.selectedLibraryId = null;
        this.renderContent();
        document.getElementById('selectedContext').classList.add('hidden');
        document.getElementById('aiSummary').value = '';
    },

    /**
     * Send generated content to the publish panel
     */
    sendToPublish() {
        const caption = document.getElementById('generatedCaption').textContent;
        const hashtags = document.getElementById('generatedHashtags').textContent;

        if (!caption && !hashtags) {
            this.showToast('Nothing generated yet', 'error');
            return;
        }

        document.getElementById('publishCaption').textContent = caption;
        document.getElementById('publishHashtags').textContent = hashtags;
        document.getElementById('publishEmpty').classList.add('hidden');
        document.getElementById('publishReady').classList.remove('hidden');

        // Reset checklist
        document.querySelectorAll('.pub-check').forEach(cb => { cb.checked = false; });

        this.showToast('Content sent to Publish panel!', 'success');
    },

    /**
     * Copy text from publish panel
     */
    async copyPublishText(elementId) {
        const text = document.getElementById(elementId).textContent;
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied!', 'success');
        } catch {
            this.showToast('Copy failed', 'error');
        }
    },

    /**
     * Update reminders panel (Phase 5: progress ring + due-soon list)
     */
    updateReminders() {
        const total = this.content.length;
        const posted = this.content.filter(c => c.status === 'posted');
        const inProgress = this.content.filter(c =>
            c.status === 'in-progress' || c.status === 'filmed' || c.status === 'edited'
        );
        const ideas = this.content.filter(c => c.status === 'idea');

        // ── Progress ring ──────────────────────────────────────────────
        const completionRate = total > 0 ? posted.length / total : 0;
        const circumference = 427.26;
        const offset = circumference * (1 - completionRate);

        const ring = document.getElementById('ringProgress');
        if (ring) {
            ring.style.strokeDashoffset = offset;
        }

        const pctEl = document.getElementById('ringPct');
        if (pctEl) pctEl.textContent = Math.round(completionRate * 100) + '%';

        // ── Dot counters ───────────────────────────────────────────────
        const postedEl = document.getElementById('postedCount');
        const inProgEl = document.getElementById('inProgressCount');
        const ideaEl   = document.getElementById('ideaCount');
        if (postedEl) postedEl.textContent = posted.length;
        if (inProgEl) inProgEl.textContent = inProgress.length;
        if (ideaEl)   ideaEl.textContent   = ideas.length;

        // ── Due-soon list ──────────────────────────────────────────────
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const pending = this.content.filter(c => c.status !== 'posted' && c.dueDate);
        const overdue = [];
        const dueSoon = [];
        const upcoming = [];

        pending.forEach(item => {
            const d = new Date(item.dueDate);
            d.setHours(0, 0, 0, 0);
            if (d < now)                    overdue.push({ ...item, urgency: 'overdue' });
            else if (d <= threeDaysFromNow) dueSoon.push({ ...item, urgency: 'due-soon' });
            else if (d <= oneWeekFromNow)   upcoming.push({ ...item, urgency: 'upcoming' });
        });

        const allItems = [...overdue, ...dueSoon, ...upcoming];
        const list = document.getElementById('remindersList');
        if (!list) return;

        if (allItems.length === 0) {
            list.innerHTML = `<li class="empty-state">All clear — no deadlines this week!</li>`;
            return;
        }

        const stageIcon = { idea: '🌰', 'in-progress': '🌱', filmed: '🌿', edited: '🌿', posted: '🥕' };
        list.innerHTML = allItems.map(item => `
            <li class="${item.urgency}" onclick="App.openViewModal('${item.id}')">
                <div class="reminder-title">${this.escapeHtml(item.title)}</div>
                <div class="reminder-date">${stageIcon[item.status] || '🌰'} ${this.formatDate(item.dueDate)} · ${item.status.replace('-', ' ')}</div>
            </li>
        `).join('');
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    },

    /**
     * Format number for display (1000 -> 1K, etc.)
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    },

    /**
     * Load account stats (followers etc.) and update the account bar
     */
    async loadAccounts() {
        try {
            const res = await fetch('/api/accounts');
            const data = await res.json();

            if (data.lastSynced) {
                const d = new Date(data.lastSynced);
                document.getElementById('lastSyncedLabel').textContent =
                    `Last synced: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }

            const bar = document.getElementById('accountStatsBar');
            if (data.tiktok || data.instagram) {
                bar.classList.remove('hidden');
                if (data.tiktok?.follower_count != null) {
                    document.getElementById('tiktokFollowers').textContent = this.formatNumber(data.tiktok.follower_count);
                }
                if (data.instagram?.followers_count != null) {
                    document.getElementById('igFollowers').textContent = this.formatNumber(data.instagram.followers_count);
                }
            }
        } catch (e) {}
    },

    /**
     * Sync metrics from TikTok + Instagram APIs
     */
    async syncMetrics() {
        const btn = document.getElementById('syncBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="icon">⏳</span> Syncing...';

        try {
            const res = await fetch('/api/sync', { method: 'POST' });
            const data = await res.json();

            // Refresh content + analytics after sync
            await this.loadContent();
            this.renderContent();
            await this.loadAccounts();
            await this.loadAnalytics();
            Carousel.refresh(this.content);

            const notConfigured = data.errors.filter(e => e.includes('Add '));
            const realErrors = data.errors.filter(e => !e.includes('Add '));

            if (data.updated > 0) {
                this.showToast(`✅ Updated ${data.updated} post(s) with fresh metrics`, 'success');
            } else if (notConfigured.length === data.errors.length) {
                this.showToast('⚠️ No API tokens configured — see console for setup instructions', 'error');
                notConfigured.forEach(e => console.warn('[Sync]', e));
            } else if (realErrors.length > 0) {
                this.showToast('Sync error: ' + realErrors[0], 'error');
            } else {
                this.showToast('Sync complete — no new matches found', 'success');
            }
        } catch (err) {
            this.showToast('Sync failed: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="icon">🔄</span> Sync Metrics';
        }
    },

    /**
     * Load and render the analytics panel (engagement stats)
     */
    async loadAnalytics() {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();

            // Update totals
            document.getElementById('totalViews').textContent = this.formatNumber(data.totals.views);
            document.getElementById('totalLikes').textContent = this.formatNumber(data.totals.likes);
            document.getElementById('avgEngagement').textContent = data.avgEngagement + '%';

            // Render engagement table
            const wrapper = document.getElementById('engagementTableWrapper');
            if (data.stats.length === 0) {
                wrapper.innerHTML = '<p class="empty-state" style="padding:12px 0;">No posted content yet.</p>';
                return;
            }

            const sorted = [...data.stats].sort((a, b) => parseFloat(b.engagementRate) - parseFloat(a.engagementRate));
            wrapper.innerHTML = `
                <table class="engagement-table">
                    <thead>
                        <tr>
                            <th>Post</th>
                            <th>Views</th>
                            <th>Likes</th>
                            <th>Comments</th>
                            <th>Shares</th>
                            <th>Eng. Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((s, i) => `
                            <tr class="${i === 0 && parseFloat(s.engagementRate) > 0 ? 'top-performer' : ''}">
                                <td class="post-title-cell" title="${this.escapeHtml(s.title)}">${this.escapeHtml(s.title.length > 28 ? s.title.slice(0, 28) + '…' : s.title)}</td>
                                <td>${this.formatNumber(s.views)}</td>
                                <td>${this.formatNumber(s.likes)}</td>
                                <td>${this.formatNumber(s.comments)}</td>
                                <td>${this.formatNumber(s.shares)}</td>
                                <td><span class="eng-rate ${parseFloat(s.engagementRate) > 5 ? 'high' : parseFloat(s.engagementRate) > 0 ? 'mid' : ''}">${s.engagementRate}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // If insights already came back, display them
            if (data.insights) this.renderInsights(data.insights);
        } catch (e) {
            console.error('Analytics load error:', e);
        }
    },

    /**
     * Fetch AI insights explicitly (button click)
     */
    async getAIInsights() {
        const btn = document.getElementById('getInsightsBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="icon">⏳</span> Analyzing...';
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();
            if (data.insights) {
                this.renderInsights(data.insights);
            } else {
                this.showToast('Not enough data with metrics yet — sync or manually add stats', 'error');
            }
        } catch (e) {
            this.showToast('Failed to get insights', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="icon">🤖</span> AI Insights';
        }
    },

    /**
     * Open the monthly calendar modal
     */
    openCalendarModal() {
        this.renderCalendar();
        document.getElementById('calendarModal').classList.remove('hidden');
    },

    closeCalendarModal() {
        document.getElementById('calendarModal').classList.add('hidden');
    },

    renderCalendar() {
        const y = this.calYear, m = this.calMonth;
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        document.getElementById('calMonthTitle').textContent = `${monthNames[m]} ${y}`;

        const today = new Date(); today.setHours(0,0,0,0);
        const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
        const startOffset = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon-start
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const prevMonthDays = new Date(y, m, 0).getDate();

        const cells = [];
        for (let i = startOffset - 1; i >= 0; i--) {
            cells.push({ day: prevMonthDays - i, current: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const items = this.content.filter(c => c.dueDate === dateStr);
            const isToday = new Date(y, m, d).getTime() === today.getTime();
            cells.push({ day: d, current: true, dateStr, items, isToday });
        }
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            cells.push({ day: d, current: false });
        }

        const grid = document.getElementById('calGrid');
        grid.innerHTML = cells.map(cell => {
            if (!cell.current) {
                return `<div class="cal-cell other-month"><span class="cal-cell-num">${cell.day}</span></div>`;
            }
            const hasContent = cell.items && cell.items.length > 0;
            const todayClass = cell.isToday ? ' today' : '';
            const hasClass = hasContent ? ' has-content' : '';
            const itemsHTML = (cell.items || []).map(item =>
                `<div class="cal-item ${item.status}" onclick="App.openViewModal('${item.id}');App.closeCalendarModal();" title="${this.escapeHtml(item.title)}">
                    ${this.escapeHtml(item.title.length > 14 ? item.title.slice(0, 14) + '…' : item.title)}
                </div>`
            ).join('');
            return `<div class="cal-cell${todayClass}${hasClass}">
                <span class="cal-cell-num">${cell.day}</span>
                ${itemsHTML}
            </div>`;
        }).join('');
    },

    /**
     * Phase 6: Render the Garden View
     */
    renderGarden(filter = 'all') {
        const grid = document.getElementById('gardenGrid');
        if (!grid) return;

        const stageClass = {
            idea: 'seed',
            'in-progress': 'sprout',
            filmed: 'plant',
            edited: 'plant',
            posted: 'harvest',
        };

        const filtered = filter === 'all'
            ? this.content
            : this.content.filter(c => {
                if (filter === 'in-progress') {
                    return ['in-progress', 'filmed', 'edited'].includes(c.status);
                }
                return c.status === filter;
            });

        const cards = filtered.map(item => {
            const art = stageClass[item.status] || 'seed';
            return `
                <div class="plant-card ${item.status}" onclick="App.openViewModal('${item.id}')">
                    <div class="plant-art ${art}"></div>
                    <div class="plant-card-title">${this.escapeHtml(item.title)}</div>
                    <div class="plant-card-status">${item.status.replace('-', ' ')}</div>
                </div>`;
        }).join('');

        const addCard = `
            <button class="plant-add-card" onclick="App.openAddModal()">
                <span class="plant-add-icon">🌱</span>
                Plant a seed
            </button>`;

        grid.innerHTML = filtered.length === 0
            ? `<p class="garden-empty">No plants here yet — try a different filter.</p>${addCard}`
            : cards + addCard;
    },

    /**
     * Phase 7: Crop Picker
     */
    openCropPicker() {
        const saved = localStorage.getItem('seedboard-crop') || '🥕';
        document.querySelectorAll('.crop-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.crop === saved);
        });
        document.getElementById('cropPickerModal').classList.remove('hidden');
    },

    closeCropPicker() {
        document.getElementById('cropPickerModal').classList.add('hidden');
    },

    confirmCrop() {
        const active = document.querySelector('.crop-option.active');
        if (!active) return;
        const crop = active.dataset.crop;
        localStorage.setItem('seedboard-crop', crop);
        document.getElementById('avatarCrop').textContent = crop;
        this.closeCropPicker();
        this.showToast('Crop updated!', 'success');
    },

    restoreCrop() {
        const saved = localStorage.getItem('seedboard-crop');
        if (saved) document.getElementById('avatarCrop').textContent = saved;
    },

    // ─────────────────────────────────────────────────────────────────
    // CSV IMPORT
    // ─────────────────────────────────────────────────────────────────

    _csvParsed: [],   // holds parsed rows between steps

    openCsvImport() {
        this.csvShowStep(1);
        document.getElementById('csvFileInput').value = '';
        document.getElementById('csvImportModal').classList.remove('hidden');
    },

    closeCsvImport() {
        document.getElementById('csvImportModal').classList.add('hidden');
    },

    csvShowStep(n) {
        document.getElementById('csvStep1').classList.toggle('hidden', n !== 1);
        document.getElementById('csvStep2').classList.toggle('hidden', n !== 2);
    },

    /** Parse CSV text into array of objects keyed by header row */
    csvParse(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        const parseLine = (line) => {
            const fields = [];
            let cur = '', inQ = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') { inQ = !inQ; continue; }
                if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; continue; }
                cur += ch;
            }
            fields.push(cur.trim());
            return fields;
        };

        const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
        return lines.slice(1)
            .filter(l => l.trim())
            .map(line => {
                const vals = parseLine(line);
                const obj = {};
                headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
                return obj;
            });
    },

    /** Map raw CSV column names to Seedboard field names */
    csvDetectMapping(headers) {
        // Each field: [ seedboardKey, label, [...aliases] ]
        const schema = [
            ['title',       'Title',     ['video title','title','post title','description','post caption','caption','content title']],
            ['views',       'Views',     ['video views','views','view count','impressions','reach','plays']],
            ['likes',       'Likes',     ['likes','like count','reactions']],
            ['comments',    'Comments',  ['comments','comment count','comments count']],
            ['shares',      'Shares',    ['shares','share count','reposts']],
            ['dueDate',     'Date',      ['create time','video create time','upload date','date','publish date','post date','timestamp','published at']],
            ['tiktokUrl',   'TikTok URL',['share url','video link','link','url','tiktok url','video url']],
            ['instagramUrl','IG URL',    ['post link','permalink','instagram url','ig url','post url']],
            ['hashtags',    'Hashtags',  ['hashtags','tags','hash tags']],
            ['category',    'Category',  ['category','content type','type']],
        ];

        const lc = headers.map(h => h.toLowerCase());
        const mapping = {};
        schema.forEach(([key, label, aliases]) => {
            const match = aliases.find(alias => lc.includes(alias));
            mapping[key] = { label, csvCol: match ? headers[lc.indexOf(match)] : null };
        });
        return mapping;
    },

    /** Detect the likely source platform from column names */
    csvDetectPlatform(headers) {
        const joined = headers.join(' ').toLowerCase();
        if (joined.includes('video title') || joined.includes('share url') || joined.includes('video views')) return 'TikTok';
        if (joined.includes('permalink') || joined.includes('post caption') || joined.includes('impressions')) return 'Instagram';
        if (joined.includes('title') && joined.includes('views')) return 'Seedboard template';
        return 'Custom';
    },

    csvReadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rows = this.csvParse(e.target.result);
            if (rows.length === 0) {
                this.showToast('No data rows found in file', 'error');
                return;
            }
            const headers = Object.keys(rows[0]);
            const mapping = this.csvDetectMapping(headers);
            const platform = this.csvDetectPlatform(headers);

            // Convert rows using the mapping
            this._csvParsed = rows.map(row => {
                const item = {};
                Object.entries(mapping).forEach(([key, { csvCol }]) => {
                    if (!csvCol) return;
                    const raw = row[csvCol] || '';
                    if (['views','likes','comments','shares'].includes(key)) {
                        item[key] = parseInt(raw.replace(/,/g, ''), 10) || 0;
                    } else if (key === 'dueDate') {
                        // Try to normalise to YYYY-MM-DD
                        const d = new Date(raw);
                        item[key] = isNaN(d) ? raw : d.toISOString().split('T')[0];
                    } else {
                        item[key] = raw;
                    }
                });
                return item;
            }).filter(item => item.title || item.views);

            // Build UI for step 2
            const banner = document.getElementById('csvDetectedBanner');
            banner.textContent = `✅  ${platform} export detected — ${this._csvParsed.length} rows ready to import`;

            // Mapping grid
            const grid = document.getElementById('csvMappingGrid');
            grid.innerHTML = Object.entries(mapping).map(([key, { label, csvCol }]) => `
                <div class="csv-map-row${csvCol ? '' : ' unmapped'}">
                    <span class="csv-map-field">${label}</span>
                    <span class="csv-map-arrow">←</span>
                    <span class="csv-map-col">${csvCol || 'not found'}</span>
                </div>`).join('');

            // Preview table (first 5 rows)
            const previewFields = ['title','views','likes','comments','shares','dueDate'];
            const preview = this._csvParsed.slice(0, 5);
            document.getElementById('csvPreviewCount').textContent = `(showing ${preview.length} of ${this._csvParsed.length})`;
            document.getElementById('csvImportCount').textContent = this._csvParsed.length;
            const table = document.getElementById('csvPreviewTable');
            table.innerHTML = `
                <thead><tr>${previewFields.map(f => `<th>${f}</th>`).join('')}</tr></thead>
                <tbody>${preview.map(row => `<tr>${previewFields.map(f =>
                    `<td title="${this.escapeHtml(String(row[f]||''))}">${this.escapeHtml(String(row[f]||'—').slice(0,30))}</td>`
                ).join('')}</tr>`).join('')}</tbody>`;

            this.csvShowStep(2);
        };
        reader.readAsText(file);
    },

    async csvDoImport() {
        if (!this._csvParsed.length) return;
        this.showLoading(`Importing ${this._csvParsed.length} items…`);
        try {
            const res = await fetch('/api/content/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this._csvParsed),
            });
            const result = await res.json();
            this.hideLoading();
            this.closeCsvImport();
            await this.loadContent();
            this.renderContent();
            this.updateReminders();
            this.renderGarden();
            Carousel.refresh(this.content);
            this.showToast(`Import complete — ${result.created} added, ${result.updated} updated`, 'success');
        } catch (err) {
            this.hideLoading();
            this.showToast('Import failed: ' + err.message, 'error');
        }
    },

    csvDownloadTemplate() {
        const headers = 'title,status,dueDate,views,likes,comments,shares,category,tiktokUrl,instagramUrl,hashtags,summary';
        const example = '"My first garden reel",posted,2026-02-15,12000,850,42,30,"🌱 Garden","https://tiktok.com/...","","#gardening #homegrown","Time lapse of my raised beds"';
        const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'seedboard-template.csv';
        a.click();
    },

    /**
     * Phase 6: bind garden filter buttons
     */
    bindGardenFilters() {
        document.getElementById('gardenFilters')?.addEventListener('click', e => {
            const btn = e.target.closest('.garden-filter');
            if (!btn) return;
            document.querySelectorAll('.garden-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.renderGarden(btn.dataset.filter);
        });
    },

    renderInsights(text) {
        const box = document.getElementById('aiInsightsBox');
        const content = document.getElementById('insightsContent');
        // Convert bullet points / newlines to HTML
        content.innerHTML = text
            .split('\n')
            .filter(l => l.trim())
            .map(l => `<p>${this.escapeHtml(l)}</p>`)
            .join('');
        box.classList.remove('hidden');
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

/* ============================
   PERFORMANCE CAROUSEL
   ============================ */
const Carousel = {
    current: 0,
    total: 3,
    autoTimer: null,

    init(content) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        const cards = this.buildCards(content);
        this.total = cards.length;
        track.innerHTML = cards.join('');
        this.buildDots();
        this.goTo(0);
        this.startAuto();

        const el = document.getElementById('insightCarousel');
        el.addEventListener('mouseenter', () => this.stopAuto());
        el.addEventListener('mouseleave', () => this.startAuto());

        document.getElementById('carouselPrev').addEventListener('click', () => {
            this.stopAuto();
            this.goTo((this.current - 1 + this.total) % this.total);
            this.startAuto();
        });
        document.getElementById('carouselNext').addEventListener('click', () => {
            this.stopAuto();
            this.goTo((this.current + 1) % this.total);
            this.startAuto();
        });
    },

    refresh(content) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        const cards = this.buildCards(content);
        this.total = cards.length;
        track.style.transition = 'none';
        track.innerHTML = cards.join('');
        this.buildDots();
        this.goTo(Math.min(this.current, this.total - 1));
        setTimeout(() => { track.style.transition = ''; }, 50);
    },

    buildDots() {
        const dots = document.getElementById('carouselDots');
        if (!dots) return;
        dots.innerHTML = Array.from({ length: this.total }, (_, i) =>
            `<button class="carousel-dot ${i === this.current ? 'active' : ''}" data-index="${i}"></button>`
        ).join('');
        dots.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.stopAuto();
                this.goTo(idx);
                this.startAuto();
            });
        });
    },

    goTo(index) {
        this.current = index;
        const track = document.getElementById('carouselTrack');
        if (track) track.style.transform = `translateX(-${index * 100}%)`;
        document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    },

    startAuto() {
        this.stopAuto();
        this.startProgress();
        this.autoTimer = setInterval(() => {
            this.goTo((this.current + 1) % this.total);
            this.startProgress();
        }, 6000);
    },

    stopAuto() {
        clearInterval(this.autoTimer);
        const fill = document.getElementById('carouselProgressFill');
        if (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
        }
    },

    startProgress() {
        const fill = document.getElementById('carouselProgressFill');
        if (!fill) return;
        fill.style.transition = 'none';
        fill.style.width = '0%';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            fill.style.transition = 'width 6s linear';
            fill.style.width = '100%';
        }));
    },

    fmt(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    },

    buildCards(content) {
        const posted = content.filter(c => c.status === 'posted');
        return [
            this.buildCalendarCard(content),
            this.buildMonthlyPerformanceCard(posted, content),
            this.buildPipelineCard(content),
        ];
    },

    // ── Card 1: Full-month content calendar ─────────────────────────
    buildCalendarCard(content) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][month];
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDow = new Date(year, month, 1).getDay();
        const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon = 0
        const todayDay = now.getDate();

        // Index content by dueDate
        const byDate = {};
        content.forEach(item => {
            if (!item.dueDate) return;
            const d = item.dueDate.split('T')[0];
            if (!byDate[d]) byDate[d] = [];
            byDate[d].push(item);
        });

        // Empty offset cells
        let cells = Array(startOffset).fill('<div class="mini-cal-cell empty"></div>').join('');

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
            const items = byDate[dateStr] || [];
            const isToday = d === todayDay;
            let dotClass = '';
            if (items.length > 0) {
                if      (items.some(i => i.status === 'posted'))                     dotClass = 'dot-posted';
                else if (items.some(i => ['filmed','edited'].includes(i.status)))    dotClass = 'dot-plant';
                else if (items.some(i => i.status === 'in-progress'))               dotClass = 'dot-sprout';
                else                                                                  dotClass = 'dot-seed';
            }
            cells += `<div class="mini-cal-cell${isToday ? ' today' : ''}">
                <span class="mini-cal-num">${d}</span>
                ${dotClass ? `<span class="mini-cal-dot ${dotClass}"></span>` : ''}
            </div>`;
        }

        const totalPlanned = Object.keys(byDate).filter(d => d.startsWith(monthPrefix)).length;
        const postedThis   = content.filter(c => c.status === 'posted' && c.dueDate && c.dueDate.startsWith(monthPrefix)).length;
        const insight = totalPlanned > 0
            ? `${postedThis} posted · ${totalPlanned - postedThis} in progress this month`
            : 'No content planned yet — add due dates to see your calendar fill up';

        return `<div class="carousel-card card-calendar">
            <div class="card-top">
                <span class="card-emoji">📅</span>
                <span class="card-label">CONTENT CALENDAR</span>
                <span class="card-month-label">${monthName} ${year}</span>
            </div>
            <div class="mini-cal-header"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
            <div class="mini-cal-grid">${cells}</div>
            <div class="mini-cal-legend">
                <span class="mini-legend-item"><span class="mini-legend-dot dot-posted"></span>posted</span>
                <span class="mini-legend-item"><span class="mini-legend-dot dot-plant"></span>filmed/edited</span>
                <span class="mini-legend-item"><span class="mini-legend-dot dot-sprout"></span>growing</span>
                <span class="mini-legend-item"><span class="mini-legend-dot dot-seed"></span>idea</span>
            </div>
            <div class="card-insight">💡 ${insight}</div>
        </div>`;
    },

    // ── Card 2: Monthly Performance (reach + top type + engagement) ──
    buildMonthlyPerformanceCard(posted, content) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month];

        const thisMonth = posted.filter(c => c.dueDate && c.dueDate.startsWith(monthPrefix));
        const postedData = thisMonth.length > 0 ? thisMonth : posted;
        const label = thisMonth.length > 0 ? `${monthName} ${year}` : 'All Time';

        // Reach
        const totalViews = postedData.reduce((s, c) => s + (c.views || 0), 0);
        const totalLikes = postedData.reduce((s, c) => s + (c.likes || 0), 0);
        const likeRate   = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0';

        // Top content type
        const categoryMap = {
            '🌱 Garden':    ['garden','plant','grow','flower','soil','homegrown','outdoor','nature','bloom','harvest','compost'],
            '🏠 Lifestyle': ['lifestyle','cozy','home','living','life','daily','routine','morning','aesthetic','vibe'],
            '👗 Fashion':   ['fashion','outfit','style','wear','clothes','ootd','fit','look','thrift'],
            '🍳 Food':      ['food','recipe','cook','eat','drink','meal','bake','coffee','kitchen','snack'],
            '🎵 Music':     ['music','song','vibe','playlist','beats','sound','listen'],
        };
        const scores = {};
        postedData.forEach(item => {
            let cat = item.category || '';
            if (!cat) {
                const text = `${item.hashtags||''} ${item.title||''} ${item.summary||''}`.toLowerCase();
                for (const [c, kws] of Object.entries(categoryMap)) {
                    if (kws.some(kw => text.includes(kw))) { cat = c; break; }
                }
            }
            if (!cat) cat = '✨ Other';
            if (!scores[cat]) scores[cat] = { views: 0, count: 0 };
            scores[cat].views += item.views || 0;
            scores[cat].count++;
        });
        const ranked = Object.entries(scores)
            .map(([cat, s]) => ({ cat, avg: s.count > 0 ? Math.round(s.views / s.count) : 0, count: s.count }))
            .sort((a, b) => b.avg - a.avg);
        const topType = ranked[0];

        // Engagement grade
        const withViews = postedData.filter(c => c.views > 0);
        let gradeVal = '—', gradeColor = 'var(--text-dim)', engRate = '—';
        if (withViews.length > 0) {
            const rates = withViews.map(c => (((c.likes||0)+(c.comments||0)+(c.shares||0))/c.views)*100);
            const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
            engRate = avg.toFixed(1) + '%';
            const grades = [
                { grade: 'A+', min: 8, color: '#7cb342' },
                { grade: 'A',  min: 5, color: '#7cb342' },
                { grade: 'B',  min: 3, color: '#f49325' },
                { grade: 'C',  min: 1, color: '#eb7c0d' },
                { grade: 'D',  min: 0, color: '#e74c3c' },
            ];
            const g = grades.find(x => avg >= x.min) || grades[grades.length - 1];
            gradeVal = g.grade; gradeColor = g.color;
        }

        const typeHTML = topType
            ? `<div class="perf-type-name">${topType.cat}</div><div class="perf-type-note">${topType.count} post${topType.count!==1?'s':''} · ${this.fmt(topType.avg)} avg</div>`
            : `<div class="perf-type-name">—</div><div class="perf-type-note">no data</div>`;

        return `<div class="carousel-card card-monthly-perf">
            <div class="card-top">
                <span class="card-emoji">📈</span>
                <span class="card-label">MONTHLY PERFORMANCE</span>
                <span class="card-month-label">${label}</span>
            </div>
            <div class="perf-grid">
                <div class="perf-section">
                    <div class="perf-section-label">REACH</div>
                    <div class="perf-big-num">${this.fmt(totalViews)}</div>
                    <div class="perf-sub">${this.fmt(totalLikes)} likes · ${likeRate}% rate</div>
                </div>
                <div class="perf-vdivider"></div>
                <div class="perf-section">
                    <div class="perf-section-label">TOP TYPE</div>
                    ${typeHTML}
                </div>
                <div class="perf-vdivider"></div>
                <div class="perf-section">
                    <div class="perf-section-label">ENGAGEMENT</div>
                    <div class="perf-grade" style="color:${gradeColor}">${gradeVal}</div>
                    <div class="perf-eng-rate">${engRate}</div>
                </div>
            </div>
            <div class="card-insight">💡 ${postedData.length} post${postedData.length!==1?'s':''} tracked · ${label}</div>
        </div>`;
    },

    // ── Card 3: Pipeline Health — monthly created vs published ───────
    buildPipelineCard(content) {
        const now = new Date();
        const months = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label:  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' \'' + String(d.getFullYear()).slice(2),
                prefix: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            });
        }

        const rows = months.map(m => ({
            ...m,
            created:   content.filter(c => c.createdDate && c.createdDate.startsWith(m.prefix)).length,
            published: content.filter(c => c.status === 'posted' && c.dueDate && c.dueDate.startsWith(m.prefix)).length,
        })).filter(m => m.created > 0 || m.published > 0);

        if (rows.length === 0) {
            return `<div class="carousel-card card-pipeline">
                <div class="card-top"><span class="card-emoji">📊</span><span class="card-label">PIPELINE HEALTH</span></div>
                <div class="empty-card-msg">Add content to start tracking your monthly pipeline</div>
            </div>`;
        }

        const maxVal = Math.max(...rows.map(m => Math.max(m.created, m.published)), 1);
        const rowsHTML = rows.map(m => {
            const cW = Math.max(4, Math.round((m.created   / maxVal) * 100));
            const pW = Math.max(4, Math.round((m.published / maxVal) * 100));
            return `<div class="pl-month-row">
                <span class="pl-month-lbl">${m.label}</span>
                <div class="pl-bars">
                    <div class="pl-bar-line">
                        <span class="pl-bar-tag created">Created</span>
                        <div class="pl-bar-track"><div class="pl-bar-fill bar-created" style="width:${cW}%"></div></div>
                        <span class="pl-bar-num">${m.created}</span>
                    </div>
                    <div class="pl-bar-line">
                        <span class="pl-bar-tag published">Published</span>
                        <div class="pl-bar-track"><div class="pl-bar-fill bar-published" style="width:${pW}%"></div></div>
                        <span class="pl-bar-num">${m.published}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        const latest = rows[rows.length - 1];
        const gap = latest.created - latest.published;
        const insight = gap > 0
            ? `${gap} piece${gap!==1?'s':''} from ${latest.label} still in the pipeline`
            : latest.published > 0
                ? `All ${latest.published} pieces from ${latest.label} are published — keep going!`
                : 'No activity this month yet — plant some seeds!';

        return `<div class="carousel-card card-pipeline">
            <div class="card-top"><span class="card-emoji">📊</span><span class="card-label">PIPELINE HEALTH</span></div>
            <div class="pl-months">${rowsHTML}</div>
            <div class="card-insight">💡 ${insight}</div>
        </div>`;
    },
};
