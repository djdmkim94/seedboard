/**
 * TikTok Content Dashboard - Main Application
 */

const App = {
    // State
    content: [],
    currentEditId: null,
    isConnected: true,
    selectedLibraryId: null,

    /**
     * Initialize the application
     */
    async init() {
        this.bindEvents();
        await this.loadContent();
        Carousel.init(this.content);
        this.updateConnectionStatus(true);
        this.renderContent();
        this.updateReminders();
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

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.renderContent());
        document.getElementById('searchFilter').addEventListener('input', () => this.renderContent());

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

        filtered.sort((a, b) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdDate) - new Date(a.createdDate);
        });

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state">${this.content.length === 0 ? 'Add your first idea!' : 'No matches found.'}</div>`;
            return;
        }

        list.innerHTML = filtered.map(item => `
            <div class="library-card ${this.selectedLibraryId === item.id ? 'selected' : ''}"
                 data-id="${item.id}"
                 onclick="App.selectLibraryItem('${item.id}')">
                <span class="library-card-status ${item.status}"></span>
                <div class="library-card-info">
                    <div class="library-card-title">${this.escapeHtml(item.title)}</div>
                    <div class="library-card-meta">
                        <span class="status-badge ${item.status}">${item.status.replace('-', ' ')}</span>
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
     * Update reminders panel
     */
    updateReminders() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Filter content that's not posted and has due dates
        const pending = this.content.filter(c =>
            c.status !== 'posted' && c.dueDate
        );

        const overdue = [];
        const dueSoon = [];
        const upcoming = [];

        pending.forEach(item => {
            const dueDate = new Date(item.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate < now) {
                overdue.push(item);
            } else if (dueDate <= threeDaysFromNow) {
                dueSoon.push(item);
            } else if (dueDate <= oneWeekFromNow) {
                upcoming.push(item);
            }
        });

        // Update counts
        document.getElementById('overdueCount').textContent = overdue.length;
        document.getElementById('dueSoonCount').textContent = dueSoon.length;
        document.getElementById('upcomingCount').textContent = upcoming.length;

        // Update list
        const list = document.getElementById('remindersList');
        const allItems = [
            ...overdue.map(i => ({ ...i, urgency: 'overdue' })),
            ...dueSoon.map(i => ({ ...i, urgency: 'due-soon' })),
            ...upcoming.map(i => ({ ...i, urgency: 'upcoming' })),
        ];

        if (allItems.length === 0) {
            list.innerHTML = `<li class="empty-state">No upcoming deadlines this week!</li>`;
            return;
        }

        list.innerHTML = allItems.map(item => `
            <li class="${item.urgency}" onclick="App.openViewModal('${item.id}')">
                <div class="reminder-title">${this.escapeHtml(item.title)}</div>
                <div class="reminder-date">${this.formatDate(item.dueDate)} - ${item.status.replace('-', ' ')}</div>
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
    total: 6,
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
            this.buildReachCard(posted),
            this.buildTypeCard(posted),
            this.buildEngagementCard(posted),
            this.buildStarCard(posted),
            this.buildPipelineCard(content),
        ];
    },

    buildCalendarCard(content) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dow = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        const days = dayNames.map((name, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const items = content.filter(c => c.dueDate === dateStr);
            const isToday = d.getTime() === today.getTime();
            const hasPosted = items.some(c => c.status === 'posted');
            const hasDue = items.some(c => c.status !== 'posted');
            return { name, day: d.getDate(), isToday, hasPosted, hasDue, count: items.length };
        });

        const scheduled = days.filter(d => d.count > 0).length;
        const nextDue = days.find(d => d.hasDue);
        const insight = nextDue
            ? `Next deadline: ${nextDue.name} · ${scheduled} item${scheduled !== 1 ? 's' : ''} this week`
            : scheduled > 0
                ? `${scheduled} posts scheduled this week — on track!`
                : 'No deadlines this week — plan your next drop';

        const dayHTML = days.map(d => `<div class="cal-day${d.isToday ? ' today' : ''}${d.hasPosted ? ' posted' : ''}${d.hasDue && !d.hasPosted ? ' due' : ''}">
                <span class="cal-name">${d.name}</span>
                <span class="cal-num">${d.day}</span>
                <span class="cal-dot"></span>
            </div>`).join('');

        return `<div class="carousel-card card-calendar">
            <div class="card-top"><span class="card-emoji">📅</span><span class="card-label">CONTENT CALENDAR</span></div>
            <div class="calendar-week">${dayHTML}</div>
            <div class="card-insight">${insight}</div>
        </div>`;
    },

    buildReachCard(posted) {
        const totalViews = posted.reduce((s, c) => s + (c.views || 0), 0);
        const totalLikes = posted.reduce((s, c) => s + (c.likes || 0), 0);
        const likeRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0';
        const best = [...posted].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
        const insight = best && best.views > 0
            ? `Top reach: "${best.title}" — ${this.fmt(best.views)} views`
            : 'Post content and sync metrics to start tracking reach';

        return `<div class="carousel-card card-reach">
            <div class="card-top"><span class="card-emoji">👁️</span><span class="card-label">TOTAL REACH</span></div>
            <div class="card-big-stat">${this.fmt(totalViews)}</div>
            <div class="card-sub-stats">
                <div class="sub-stat"><strong>${this.fmt(totalLikes)}</strong><span>likes</span></div>
                <div class="sub-stat-divider"></div>
                <div class="sub-stat"><strong>${likeRate}%</strong><span>like rate</span></div>
                <div class="sub-stat-divider"></div>
                <div class="sub-stat"><strong>${posted.length}</strong><span>posts</span></div>
            </div>
            <div class="card-insight">💡 ${insight}</div>
        </div>`;
    },

    buildTypeCard(posted) {
        const categoryMap = {
            '🌱 Garden': ['garden', 'plant', 'grow', 'flower', 'soil', 'homegrown', 'outdoor', 'nature', 'bloom', 'harvest', 'compost'],
            '🏠 Lifestyle': ['lifestyle', 'cozy', 'home', 'living', 'life', 'daily', 'routine', 'morning', 'aesthetic', 'vibe'],
            '👗 Fashion': ['fashion', 'outfit', 'style', 'wear', 'clothes', 'ootd', 'fit', 'look', 'thrift'],
            '🍳 Food': ['food', 'recipe', 'cook', 'eat', 'drink', 'meal', 'bake', 'coffee', 'kitchen', 'snack'],
            '🎵 Music': ['music', 'song', 'vibe', 'playlist', 'beats', 'sound', 'listen'],
        };

        const scores = {};
        Object.keys(categoryMap).forEach(cat => { scores[cat] = { views: 0, count: 0 }; });
        posted.forEach(item => {
            const text = `${item.hashtags || ''} ${item.title || ''} ${item.summary || ''}`.toLowerCase();
            for (const [cat, kws] of Object.entries(categoryMap)) {
                if (kws.some(kw => text.includes(kw))) {
                    scores[cat].views += item.views || 0;
                    scores[cat].count++;
                    break;
                }
            }
        });

        const ranked = Object.entries(scores)
            .filter(([, s]) => s.count > 0)
            .map(([cat, s]) => ({ cat, avg: Math.round(s.views / s.count), count: s.count }))
            .sort((a, b) => b.avg - a.avg);

        if (ranked.length === 0) {
            return `<div class="carousel-card card-types">
                <div class="card-top"><span class="card-emoji">🏆</span><span class="card-label">CONTENT TYPE RANKING</span></div>
                <div class="empty-card-msg">Post content and sync metrics to see which types perform best</div>
            </div>`;
        }

        const maxAvg = ranked[0].avg || 1;
        const barsHTML = ranked.slice(0, 4).map(({ cat, avg }) => `<div class="type-row">
                <span class="type-name">${cat}</span>
                <div class="type-bar-track"><div class="type-bar-fill" style="width:${Math.max(8, Math.round((avg / maxAvg) * 100))}%"></div></div>
                <span class="type-avg">${this.fmt(avg)} avg</span>
            </div>`).join('');

        return `<div class="carousel-card card-types">
            <div class="card-top"><span class="card-emoji">🏆</span><span class="card-label">CONTENT TYPE RANKING</span></div>
            <div class="type-bars">${barsHTML}</div>
            <div class="card-insight">💡 Double down on ${ranked[0].cat} — your highest avg reach</div>
        </div>`;
    },

    buildEngagementCard(posted) {
        const withViews = posted.filter(c => c.views > 0);
        if (withViews.length === 0) {
            return `<div class="carousel-card card-engagement">
                <div class="card-top"><span class="card-emoji">⚡</span><span class="card-label">ENGAGEMENT SCORE</span></div>
                <div class="empty-card-msg">Sync metrics to calculate your engagement score</div>
            </div>`;
        }

        const rates = withViews.map(c => (((c.likes || 0) + (c.comments || 0) + (c.shares || 0)) / c.views) * 100);
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        const grades = [
            { grade: 'A+', min: 8, color: '#00c853', next: null, nextLabel: null },
            { grade: 'A',  min: 5, color: '#00c853', next: 8,    nextLabel: 'A+' },
            { grade: 'B',  min: 3, color: '#00f2ea', next: 5,    nextLabel: 'A'  },
            { grade: 'C',  min: 1, color: '#ffc107', next: 3,    nextLabel: 'B'  },
            { grade: 'D',  min: 0, color: '#ff5252', next: 1,    nextLabel: 'C'  },
        ];
        const g = grades.find(x => avg >= x.min) || grades[grades.length - 1];
        const bandMax = g.next || (g.min + 3);
        const progress = Math.min(100, Math.round(((avg - g.min) / (bandMax - g.min)) * 100));
        const toNext = g.next
            ? `${(g.next - avg).toFixed(1)}% more engagement to reach grade ${g.nextLabel}`
            : "Elite! You're in the top engagement tier";

        return `<div class="carousel-card card-engagement">
            <div class="card-top"><span class="card-emoji">⚡</span><span class="card-label">ENGAGEMENT SCORE</span></div>
            <div class="grade-row">
                <div class="grade-letter" style="color:${g.color}">${g.grade}</div>
                <div class="grade-details">
                    <div class="grade-rate">${avg.toFixed(2)}% avg engagement</div>
                    <div class="grade-bar-wrap">
                        <div class="grade-bar-track"><div class="grade-bar-fill" style="width:${progress}%;background:${g.color}"></div></div>
                        <span class="grade-progress-label">${progress}%</span>
                    </div>
                </div>
            </div>
            <div class="card-insight">💡 ${toNext}</div>
        </div>`;
    },

    buildStarCard(posted) {
        const withViews = posted.filter(c => c.views > 0);
        if (withViews.length === 0) {
            return `<div class="carousel-card card-star">
                <div class="card-top"><span class="card-emoji">🔥</span><span class="card-label">STAR POST</span></div>
                <div class="empty-card-msg">Sync your TikTok metrics to find your star post</div>
            </div>`;
        }

        const star = [...withViews].sort((a, b) => {
            const eA = (((a.likes || 0) + (a.comments || 0) + (a.shares || 0)) / a.views) * 100;
            const eB = (((b.likes || 0) + (b.comments || 0) + (b.shares || 0)) / b.views) * 100;
            return eB - eA;
        })[0];
        const eng = (((star.likes || 0) + (star.comments || 0) + (star.shares || 0)) / star.views * 100).toFixed(2);

        return `<div class="carousel-card card-star">
            <div class="card-top"><span class="card-emoji">🔥</span><span class="card-label">STAR POST</span></div>
            <div class="star-title">${star.title}</div>
            <div class="star-metrics">
                <div class="star-metric"><span class="star-val">${this.fmt(star.views)}</span><span class="star-lbl">views</span></div>
                <div class="star-metric"><span class="star-val">${this.fmt(star.likes)}</span><span class="star-lbl">likes</span></div>
                <div class="star-metric"><span class="star-val">${this.fmt(star.comments || 0)}</span><span class="star-lbl">comments</span></div>
                <div class="star-metric star-highlight"><span class="star-val">${eng}%</span><span class="star-lbl">engagement</span></div>
            </div>
            <div class="card-insight">💡 This is resonating — make more content like this one</div>
        </div>`;
    },

    buildPipelineCard(content) {
        const stages = [
            { key: 'idea',        label: 'Ideas',   emoji: '💡' },
            { key: 'in-progress', label: 'WIP',     emoji: '🎬' },
            { key: 'filmed',      label: 'Filmed',  emoji: '📹' },
            { key: 'edited',      label: 'Edited',  emoji: '✂️' },
            { key: 'posted',      label: 'Posted',  emoji: '✅' },
        ];
        const counts = stages.map(s => ({ ...s, count: content.filter(c => c.status === s.key).length }));
        const postedCount = counts.find(s => s.key === 'posted')?.count || 0;
        const inFlight = content.length - postedCount;

        let score = 0;
        if (postedCount > 0) score += 40;
        if (inFlight > 0) score += 30;
        score += Math.min(30, counts.filter(s => s.key !== 'posted' && s.count > 0).length * 10);

        const insight = inFlight === 0 && postedCount > 0
            ? 'Pipeline empty — brainstorm your next batch of ideas!'
            : inFlight > 3
                ? `${inFlight} pieces in production — great content velocity!`
                : postedCount === 0
                    ? 'Post your first piece to start building momentum'
                    : `${inFlight} piece${inFlight !== 1 ? 's' : ''} in the works — keep it going!`;

        const stagesHTML = counts.map(s => `<div class="pipeline-stage${s.count > 0 ? ' active' : ''}">
                <span class="pipeline-emoji">${s.emoji}</span>
                <span class="pipeline-count">${s.count}</span>
                <span class="pipeline-label">${s.label}</span>
            </div>`).join('<div class="pipeline-arrow">›</div>');

        return `<div class="carousel-card card-pipeline">
            <div class="card-top"><span class="card-emoji">📊</span><span class="card-label">PIPELINE HEALTH</span></div>
            <div class="pipeline-stages">${stagesHTML}</div>
            <div class="pipeline-score-row">
                <span class="pipeline-score-label">Pipeline Score</span>
                <span class="pipeline-score-val">${score}/100</span>
            </div>
            <div class="card-insight">💡 ${insight}</div>
        </div>`;
    },
};
