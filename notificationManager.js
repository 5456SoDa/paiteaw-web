/**
 * ============================================
 * NOTIFICATION MANAGER - v2.0.0
 * ============================================
 * 
 * ระบบแจ้งเตือนอัจฉริยะสำหรับ Dashboard
 * รองรับ Toast, Modal, Alert, Confirm Notifications
 * 
 * ข้อมูล:
 * - Toast Notifications (ล้อเลียง style)
 * - Modal Notifications (กึ่งกลางหน้าจอ)
 * - Alert Notifications (แจ้งเตือนสำคัญ)
 * - Confirm Dialogs (ยืนยันการกระทำ)
 * - Queue Management (จัดการแถวคิว)
 * - Sound Effects (เสียงแจ้งเตือน)
 * - Animations (การ animate smooth)
 * - Accessibility (รองรับ ARIA)
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.toastContainer = null;
        this.notificationQueue = [];
        this.isProcessing = false;
        this.settings = {
            position: 'top-right', // top-right, top-left, top-center, bottom-right, bottom-left, bottom-center
            duration: 4000, // ms
            maxToasts: 5,
            soundEnabled: true,
            animationDuration: 300, // ms
            zIndex: 9999,
        };

        this.init();
    }

    /**
     * ============================================
     * INITIALIZATION
     * ============================================
     */
    init() {
        this.createToastContainer();
        this.attachKeyboardShortcuts();
        this.detectDarkMode();
        console.log('✅ NotificationManager initialized');
    }

    createToastContainer() {
        if (this.toastContainer) return;

        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'notification-container';
        this.toastContainer.setAttribute('role', 'region');
        this.toastContainer.setAttribute('aria-live', 'polite');
        this.toastContainer.setAttribute('aria-label', 'Notifications');

        const positionClass = this.getPositionClass(this.settings.position);
        this.toastContainer.className = `fixed ${positionClass} flex flex-col gap-3 p-4 pointer-events-none z-[${this.settings.zIndex}]`;
        this.toastContainer.style.zIndex = this.settings.zIndex;

        document.body.appendChild(this.toastContainer);
    }

    getPositionClass(position) {
        const positions = {
            'top-right': 'top-0 right-0',
            'top-left': 'top-0 left-0',
            'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
            'bottom-right': 'bottom-0 right-0',
            'bottom-left': 'bottom-0 left-0',
            'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2'
        };
        return positions[position] || positions['top-right'];
    }

    /**
     * ============================================
     * TOAST NOTIFICATIONS
     * ============================================
     */
    toast(message, type = 'info', options = {}) {
        const config = { ...this.settings, ...options };

        const notification = {
            id: `toast-${Date.now()}-${Math.random()}`,
            message,
            type, // info, success, warning, error
            duration: config.duration,
            timestamp: new Date(),
        };

        if (this.notifications.length >= this.settings.maxToasts) {
            this.notifications.shift();
        }

        this.notifications.push(notification);
        this.renderToast(notification, config);

        if (config.soundEnabled) {
            this.playSound(type);
        }

        return notification.id;
    }

    renderToast(notification, config) {
        const toastElement = document.createElement('div');
        toastElement.id = notification.id;
        toastElement.className = `notification-toast ${notification.type} pointer-events-auto`;
        toastElement.setAttribute('role', 'status');
        toastElement.setAttribute('aria-live', 'assertive');

        const bgColor = this.getToastBgColor(notification.type);
        const borderColor = this.getToastBorderColor(notification.type);
        const icon = this.getToastIcon(notification.type);

        toastElement.innerHTML = `
            <div class="${bgColor} border-l-4 ${borderColor} rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in">
                <span class="material-symbols-outlined text-lg flex-shrink-0">${icon}</span>
                <p class="text-sm font-medium flex-1">${this.escapeHtml(notification.message)}</p>
                <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2 flex-shrink-0 close-notification" 
                        onclick="notificationManager.removeToast('${notification.id}')"
                        aria-label="ปิดการแจ้งเตือน">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        `;

        this.toastContainer.appendChild(toastElement);

        // Auto remove after duration
        if (notification.duration > 0) {
            setTimeout(() => {
                this.removeToast(notification.id);
            }, notification.duration);
        }
    }

    removeToast(id) {
        const toastElement = document.getElementById(id);
        if (toastElement) {
            toastElement.classList.add('animate-slide-out');
            setTimeout(() => {
                toastElement.remove();
            }, this.settings.animationDuration);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    /**
     * ============================================
     * MODAL NOTIFICATIONS
     * ============================================
     */
    modal(title, message, type = 'info', options = {}) {
        return new Promise((resolve) => {
            const modalId = `modal-${Date.now()}-${Math.random()}`;

            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'notification-modal fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', `${modalId}-title`);

            const bgColor = this.getModalBgColor(type);
            const icon = this.getToastIcon(type);

            const buttons = options.buttons || [
                { label: 'ตกลง', action: 'confirm', variant: 'primary' }
            ];

            const buttonsHtml = buttons.map(btn => {
                const variant = btn.variant === 'primary' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200';
                
                return `
                    <button class="${variant} px-4 py-2 rounded-lg font-medium transition-colors"
                            onclick="notificationManager.modalButtonClick('${modalId}', '${btn.action}', ${btn.callback ? 'true' : 'false'})">
                        ${btn.label}
                    </button>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-zoom-in">
                    <div class="flex items-start gap-4">
                        <span class="material-symbols-outlined text-3xl flex-shrink-0 ${this.getIconColor(type)}">${icon}</span>
                        <div class="flex-1">
                            <h2 id="${modalId}-title" class="text-xl font-bold text-gray-900 dark:text-white mb-2">${this.escapeHtml(title)}</h2>
                            <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">${this.escapeHtml(message)}</p>
                            <div class="flex gap-3 justify-end">
                                ${buttonsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Store resolve callback for button click
            window[`${modalId}_resolve`] = resolve;

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.removeModal(modalId);
                    resolve('cancel');
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.removeModal(modalId);
                    resolve('cancel');
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    modalButtonClick(modalId, action, hasCallback) {
        const resolve = window[`${modalId}_resolve`];
        this.removeModal(modalId);
        
        if (resolve) {
            resolve(action);
        }
    }

    removeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('animate-fade-out');
            setTimeout(() => {
                modal.remove();
            }, this.settings.animationDuration);
        }
    }

    /**
     * ============================================
     * ALERT NOTIFICATION
     * ============================================
     */
    alert(title, message, type = 'info', options = {}) {
        return this.modal(title, message, type, {
            buttons: [
                { label: 'ตกลง', action: 'confirm', variant: 'primary' }
            ],
            ...options
        });
    }

    /**
     * ============================================
     * CONFIRM DIALOG
     * ============================================
     */
    confirm(title, message, options = {}) {
        return this.modal(title, message, 'warning', {
            buttons: [
                { label: 'ยกเลิก', action: 'cancel', variant: 'secondary' },
                { label: 'ยืนยัน', action: 'confirm', variant: 'primary' }
            ],
            ...options
        });
    }

    /**
     * ============================================
     * SHORTCUT METHODS
     * ============================================
     */
    success(message, options = {}) {
        return this.toast(message, 'success', options);
    }

    error(message, options = {}) {
        return this.toast(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.toast(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.toast(message, 'info', options);
    }

    /**
     * ============================================
     * STYLING & COLORS
     * ============================================
     */
    getToastBgColor(type) {
        const colors = {
            success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
            error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200',
            warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
            info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        };
        return colors[type] || colors.info;
    }

    getToastBorderColor(type) {
        const colors = {
            success: 'border-green-400 dark:border-green-600',
            error: 'border-red-400 dark:border-red-600',
            warning: 'border-yellow-400 dark:border-yellow-600',
            info: 'border-blue-400 dark:border-blue-600'
        };
        return colors[type] || colors.info;
    }

    getModalBgColor(type) {
        const colors = {
            success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
            info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        };
        return colors[type] || colors.info;
    }

    getIconColor(type) {
        const colors = {
            success: 'text-green-600 dark:text-green-400',
            error: 'text-red-600 dark:text-red-400',
            warning: 'text-yellow-600 dark:text-yellow-400',
            info: 'text-blue-600 dark:text-blue-400'
        };
        return colors[type] || colors.info;
    }

    getToastIcon(type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    /**
     * ============================================
     * SOUND EFFECTS
     * ============================================
     */
    playSound(type) {
        // ใช้ Web Audio API สำหรับเสียง
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            // ความถี่ต่างกันสำหรับแต่ละประเภท
            const frequencies = {
                success: 800,
                error: 400,
                warning: 600,
                info: 500
            };

            const duration = {
                success: 0.1,
                error: 0.2,
                warning: 0.15,
                info: 0.1
            };

            oscillator.frequency.value = frequencies[type] || 500;
            oscillator.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (duration[type] || 0.1));

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + (duration[type] || 0.1));
        } catch (e) {
            console.warn('Audio context not available:', e);
        }
    }

    /**
     * ============================================
     * KEYBOARD SHORTCUTS
     * ============================================
     */
    attachKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + X = Clear all notifications
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
                this.clearAll();
            }

            // Escape = Close last notification
            if (e.key === 'Escape' && this.notifications.length > 0) {
                this.removeToast(this.notifications[this.notifications.length - 1].id);
            }
        });
    }

    /**
     * ============================================
     * UTILITY FUNCTIONS
     * ============================================
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    clearAll() {
        this.notifications.forEach(notification => {
            this.removeToast(notification.id);
        });
    }

    clearByType(type) {
        const toRemove = this.notifications.filter(n => n.type === type);
        toRemove.forEach(notification => {
            this.removeToast(notification.id);
        });
    }

    detectDarkMode() {
        const isDark = document.documentElement.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (isDark) {
            document.documentElement.classList.add('dark');
        }

        // Listen for dark mode changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });
    }

    /**
     * ============================================
     * SETTINGS
     * ============================================
     */
    configure(options) {
        this.settings = { ...this.settings, ...options };
        console.log('📋 Notification settings updated:', this.settings);
    }

    getNotifications() {
        return this.notifications;
    }

    /**
     * ============================================
     * ADVANCED NOTIFICATIONS
     * ============================================
     */
    
    /**
     * Progress Notification (with progress bar)
     */
    progress(title, message, initialProgress = 0) {
        const progressId = `progress-${Date.now()}-${Math.random()}`;
        
        const modal = document.createElement('div');
        modal.id = progressId;
        modal.className = 'notification-modal fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 animate-fade-in';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">${this.escapeHtml(title)}</h2>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">${this.escapeHtml(message)}</p>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div id="${progressId}-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                         style="width: ${initialProgress}%"></div>
                </div>
                <p id="${progressId}-text" class="text-xs text-gray-500 dark:text-gray-400 mt-2">${initialProgress}%</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        return {
            update: (progress) => {
                const bar = document.getElementById(`${progressId}-bar`);
                const text = document.getElementById(`${progressId}-text`);
                if (bar) bar.style.width = `${progress}%`;
                if (text) text.textContent = `${progress}%`;
            },
            close: () => {
                this.removeModal(progressId);
            }
        };
    }

    /**
     * Loading Notification (with spinner)
     */
    loading(message = 'กำลังโหลด...') {
        const loadingId = `loading-${Date.now()}-${Math.random()}`;
        
        const modal = document.createElement('div');
        modal.id = loadingId;
        modal.className = 'notification-modal fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 animate-fade-in';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p class="text-gray-700 dark:text-gray-300 font-medium">${this.escapeHtml(message)}</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        return {
            close: () => {
                this.removeModal(loadingId);
            }
        };
    }
}

/**
 * ============================================
 * GLOBAL INSTANCE
 * ============================================
 */
const notificationManager = new NotificationManager();

/**
 * ============================================
 * CSS ANIMATIONS (Tailwind compatible)
 * ============================================
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slide-out {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes zoom-in {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }

    .animate-slide-out {
        animation: slide-out 0.3s ease-out;
    }

    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }

    .animate-fade-out {
        animation: fade-out 0.3s ease-out;
    }

    .animate-zoom-in {
        animation: zoom-in 0.3s ease-out;
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
        .animate-slide-in,
        .animate-slide-out,
        .animate-fade-in,
        .animate-fade-out,
        .animate-zoom-in {
            animation: none !important;
        }
    }
`;
document.head.appendChild(style);

/**
 * ============================================
 * EXPORT (for use in other modules)
 * ============================================
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
