/**
 * ====================================================================
 * Utility Functions - Security, Rate Limiting, Notifications & Helpers
 * ====================================================================
 * Version: 2.0.0
 * Features: CSRF Token, Rate Limiting, Input Validation, Secure Storage
 *           Dark Mode Support, Debounce/Throttle, Performance Monitoring
 */

// ============ CSRF Token Management - ปลอดภัย ============
class CSRFTokenManager {
  constructor() {
    this.tokenKey = 'csrf-token';
    this.tokenExpiryKey = 'csrf-token-expiry';
    this.tokenExpiry = 3600000; // 1 hour
  }

  /**
   * สร้าง CSRF Token ใหม่
   * @returns {string} - Token ที่สร้างขึ้น
   */
  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const expiry = Date.now() + this.tokenExpiry;
    
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.tokenExpiryKey, expiry.toString());
    
    return token;
  }

  /**
   * ดึง CSRF Token
   * @returns {string} - Token ที่ใช้ได้
   */
  getToken() {
    const token = sessionStorage.getItem(this.tokenKey);
    const expiry = sessionStorage.getItem(this.tokenExpiryKey);
    
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
      return this.generateToken();
    }
    
    return token;
  }

  /**
   * ตรวจสอบ CSRF Token
   * @param {string} token - Token ที่ต้องการตรวจสอบ
   * @returns {boolean} - true ถ้า valid, false ถ้า invalid
   */
  validateToken(token) {
    const storedToken = sessionStorage.getItem(this.tokenKey);
    const expiry = sessionStorage.getItem(this.tokenExpiryKey);
    
    if (!storedToken || !expiry || Date.now() > parseInt(expiry)) {
      return false;
    }
    
    return token === storedToken;
  }

  /**
   * ลบ CSRF Token
   */
  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenExpiryKey);
  }
}

const csrfTokenManager = new CSRFTokenManager();

// ============ Rate Limiting - ป้องกัน Brute Force ============
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 900000) {
    /**
     * maxAttempts: จำนวนครั้งที่อนุญาต
     * windowMs: ระยะเวลาหน้าต่าง (15 นาที = 900000ms)
     */
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * ตรวจสอบว่าอนุญาตให้ทำการได้หรือไม่
   * @param {string} identifier - Identifier (email, IP, etc.)
   * @returns {object} - { allowed: boolean, remaining: number, resetTime?: Date, remainingTime?: number }
   */
  checkLimit(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    // ลบการพยายามที่เกิน windowMs
    const validAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      const oldestAttempt = validAttempts[0];
      const resetTime = new Date(oldestAttempt + this.windowMs);
      return {
        allowed: false,
        resetTime: resetTime,
        remainingTime: Math.ceil((resetTime - now) / 1000)
      };
    }
    
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    
    return {
      allowed: true,
      remaining: this.maxAttempts - validAttempts.length
    };
  }

  /**
   * รีเซ็ตการพยายาม
   * @param {string} identifier - Identifier
   */
  reset(identifier) {
    this.attempts.delete(identifier);
  }

  /**
   * ดึงเวลาที่เหลือ (ms)
   * @param {string} identifier - Identifier
   * @returns {number} - เวลาเป็นมิลลิวินาที
   */
  getRemainingTime(identifier) {
    const userAttempts = this.attempts.get(identifier) || [];
    if (userAttempts.length === 0) return 0;
    
    const oldestAttempt = userAttempts[0];
    const resetTime = oldestAttempt + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}

const loginRateLimiter = new RateLimiter(5, 900000); // 5 attempts per 15 min
const signupRateLimiter = new RateLimiter(3, 3600000); // 3 attempts per hour

// ============ Input Validation & Sanitization ============
class InputValidator {
  /**
   * ทำความสะอาดข้อความ (ลบ HTML Tags)
   * @param {string} str - ข้อความที่ต้องทำความสะอาด
   * @returns {string} - ข้อความที่สะอาดแล้ว
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[<>]/g, '')
      .trim();
  }

  /**
   * ตรวจสอบ Email
   * @param {string} email - Email ที่ต้องตรวจสอบ
   * @returns {boolean}
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * ตรวจสอบ Username (3-20 characters, alphanumeric + . _ -)
   * @param {string} username - Username ที่ต้องตรวจสอบ
   * @returns {boolean}
   */
  static validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._-]{3,20}$/;
    return usernameRegex.test(username.trim());
  }

  /**
   * ตรวจสอบ Password (8+ chars, uppercase, lowercase, digit, special char)
   * @param {string} password - Password ที่ต้องตรวจสอบ
   * @returns {boolean}
   */
  static validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!#$%^&*])[A-Za-z\d@!#$%^&*]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * ตรวจสอบว่า Password และ Confirm Password ตรงกันหรือไม่
   * @param {string} password - Password
   * @param {string} confirmPassword - Confirm Password
   * @returns {boolean}
   */
  static validatePasswordMatch(password, confirmPassword) {
    return password === confirmPassword && password.length > 0;
  }

  /**
   * Escape HTML Characters (ป้องกัน XSS)
   * @param {string} text - ข้อความที่ต้อง Escape
   * @returns {string} - ข้อความที่ Escape แล้ว
   */
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * ตรวจสอบความแข็งแรงของ Password
   * @param {string} password - Password ที่ต้องตรวจสอบ
   * @returns {object} - { strength: 'weak'|'medium'|'strong', score: 0-4, message: string }
   */
  static checkPasswordStrength(password) {
    let score = 0;
    let message = '';

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@!#$%^&*]/.test(password)) score++;

    if (score <= 2) {
      return { strength: 'weak', score, message: 'รหัสผ่านอ่อนแอเกินไป' };
    } else if (score <= 3) {
      return { strength: 'medium', score, message: 'รหัสผ่านปานกลาง' };
    } else {
      return { strength: 'strong', score, message: 'รหัสผ่านแข็งแรง' };
    }
  }
}

// ============ Notification System - Dark Mode Support ============
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.maxNotifications = 5;
    this.isDarkMode = document.documentElement.classList.contains('dark');
    this.initContainer();
    this.observeDarkMode();
  }

  /**
   * เตรียม Container สำหรับ Notifications
   */
  initContainer() {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 420px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
      this.container = container;
    } else {
      this.container = document.getElementById('notification-container');
    }
  }

  /**
   * สังเกตการเปลี่ยนแปลง Dark Mode
   */
  observeDarkMode() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          this.isDarkMode = document.documentElement.classList.contains('dark');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
  }

  /**
   * แสดง Notification
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {string} type - ประเภท ('success', 'error', 'warning', 'info')
   * @param {number} duration - ระยะเวลา (ms) ที่จะแสดง (-1 = ไม่อ่านนาน)
   * @returns {string} - ID ของ Notification
   */
  show(message, type = 'info', duration = 4000) {
    if (this.notifications.length >= this.maxNotifications) {
      this.notifications[0].remove();
      this.notifications.shift();
    }

    const notification = document.createElement('div');
    const id = `notif-${Date.now()}`;
    notification.id = id;

    // สีสำหรับแต่ละประเภท (Light & Dark Mode)
    const colors = {
      success: {
        light: { bg: '#dcfce7', border: '#86efac', text: '#166534', icon: '✓' },
        dark: { bg: '#1e4620', border: '#86efac', text: '#86efac', icon: '✓' }
      },
      error: {
        light: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: '✕' },
        dark: { bg: '#3b1a1a', border: '#fca5a5', text: '#fca5a5', icon: '✕' }
      },
      warning: {
        light: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: '!' },
        dark: { bg: '#3e3221', border: '#fcd34d', text: '#fcd34d', icon: '!' }
      },
      info: {
        light: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', icon: 'ℹ' },
        dark: { bg: '#1a2e4f', border: '#93c5fd', text: '#93c5fd', icon: 'ℹ' }
      }
    };

    const mode = this.isDarkMode ? 'dark' : 'light';
    const color = colors[type]?.[mode] || colors.info[mode];

    notification.style.cssText = `
      background-color: ${color.bg};
      border-left: 4px solid ${color.border};
      color: ${color.text};
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: ${this.isDarkMode 
        ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
        : '0 4px 12px rgba(0, 0, 0, 0.15)'};
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'Kanit', sans-serif;
      font-size: 14px;
      animation: slideInRight 0.3s ease-out;
      pointer-events: auto;
      max-width: 100%;
      word-wrap: break-word;
      backdrop-filter: blur(10px);
      border: 1px solid ${this.isDarkMode 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.05)'};
    `;

    const closeIconColor = color.text;
    notification.innerHTML = `
      <span style="font-weight: bold; font-size: 18px; flex-shrink: 0;">${color.icon}</span>
      <span style="flex: 1;">${InputValidator.escapeHtml(message)}</span>
      <button onclick="document.getElementById('${id}').remove()" style="
        background: none;
        border: none;
        color: ${closeIconColor};
        cursor: pointer;
        font-size: 20px;
        padding: 0;
        flex-shrink: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
    `;

    this.container.appendChild(notification);
    this.notifications.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOutRight 0.3s ease-out';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
              this.notifications = this.notifications.filter(n => n !== notification);
            }
          }, 300);
        }
      }, duration);
    }

    return id;
  }

  /**
   * แสดง Success Notification
   * @param {string} message - ข้อความ
   * @param {number} duration - ระยะเวลา
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * แสดง Error Notification
   * @param {string} message - ข้อความ
   * @param {number} duration - ระยะเวลา
   */
  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  /**
   * แสดง Warning Notification
   * @param {string} message - ข้อความ
   * @param {number} duration - ระยะเวลา
   */
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  /**
   * แสดง Info Notification
   * @param {string} message - ข้อความ
   * @param {number} duration - ระยะเวลา
   */
  info(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }
}

const notificationManager = new NotificationManager();

// ============ Secure Storage - Encryption ด้วย Web Crypto API ============
class SecureStorage {
  constructor(prefix = 'app_') {
    this.prefix = prefix;
    this.algorithm = { name: 'AES-GCM', length: 256 };
  }

  /**
   * สร้าง Encryption Key
   * @returns {Promise<CryptoKey>}
   */
  async createKey() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  /**
   * เข้ารหัสข้อมูล
   * @param {string} data - ข้อมูลที่ต้องเข้ารหัส
   * @param {CryptoKey} key - Encryption Key
   * @returns {Promise<string>} - ข้อมูลที่เข้ารหัส (Base64)
   */
  async encryptData(data, key) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV
      const encoded = new TextEncoder().encode(data);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoded
      );

      // รวม IV + Encrypted Data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode.apply(null, combined));
    } catch (e) {
      console.error('Encryption error:', e);
      return null;
    }
  }

  /**
   * ถอดรหัสข้อมูล
   * @param {string} encryptedData - ข้อมูลที่เข้ารหัส (Base64)
   * @param {CryptoKey} key - Decryption Key
   * @returns {Promise<string>} - ข้อมูลต้นฉบับ
   */
  async decryptData(encryptedData, key) {
    try {
      const binaryString = atob(encryptedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const iv = bytes.slice(0, 12);
      const encrypted = bytes.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('Decryption error:', e);
      return null;
    }
  }

  /**
   * เก็บข้อมูล (ไม่เข้ารหัส)
   * @param {string} key - Key สำหรับเก็บ
   * @param {any} value - ค่าที่เก็บ
   * @returns {boolean}
   */
  set(key, value) {
    try {
      const data = JSON.stringify(value);
      const storageKey = this.prefix + key;
      localStorage.setItem(storageKey, data);
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  }

  /**
   * ดึงข้อมูล (ไม่เข้ารหัส)
   * @param {string} key - Key ที่ต้องการ
   * @returns {any} - ค่าที่เก็บไว้
   */
  get(key) {
    try {
      const storageKey = this.prefix + key;
      const data = localStorage.getItem(storageKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }

  /**
   * ลบข้อมูล
   * @param {string} key - Key ที่ต้องลบ
   * @returns {boolean}
   */
  remove(key) {
    try {
      const storageKey = this.prefix + key;
      localStorage.removeItem(storageKey);
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  }

  /**
   * ลบข้อมูลทั้งหมด
   * @returns {boolean}
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  }
}

const secureStorage = new SecureStorage();

// ============ Debounce & Throttle - Helper Functions ============
class FunctionUtils {
  /**
   * Debounce Function - รอให้ผู้ใช้หยุดพิมพ์ก่อนจะ Execute
   * @param {function} func - ฟังก์ชันที่ต้อง Debounce
   * @param {number} wait - ระยะเวลารอ (ms)
   * @returns {function} - Debounced Function
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle Function - ลดการ Execute ให้เหลือเพียงครั้งเดียวต่อช่วงเวลา
   * @param {function} func - ฟังก์ชันที่ต้อง Throttle
   * @param {number} limit - ช่วงเวลา (ms)
   * @returns {function} - Throttled Function
   */
  static throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Delay - รอตามระยะเวลาที่กำหนด
   * @param {number} ms - ระยะเวลา (ms)
   * @returns {Promise}
   */
  static delay(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry - พยายาม Execute ฟังก์ชันหลายครั้งถ้า Error
   * @param {function} func - ฟังก์ชันที่ต้อง Retry
   * @param {number} maxAttempts - จำนวนครั้งสูงสุด
   * @param {number} delay - ระยะเวลา Delay ระหว่างครั้ง (ms)
   * @returns {Promise}
   */
  static async retry(func, maxAttempts = 3, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await func();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await this.delay(delay);
      }
    }
  }
}

// ============ Performance Monitoring ============
class PerformanceMonitor {
  /**
   * เริ่ม Monitoring
   */
  static init() {
    if ('PerformanceObserver' in window) {
      this.trackLCP();
      this.trackFID();
      this.trackCLS();
    }
  }

  /**
   * ติดตาม Largest Contentful Paint (LCP)
   */
  static trackLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('📊 LCP:', lastEntry.renderTime || lastEntry.loadTime, 'ms');
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.log('LCP tracking not supported');
    }
  }

  /**
   * ติดตาม First Input Delay (FID)
   */
  static trackFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('⏱️ FID:', entry.processingDuration, 'ms');
        });
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.log('FID tracking not supported');
    }
  }

  /**
   * ติดตาม Cumulative Layout Shift (CLS)
   */
  static trackCLS() {
    try {
      let clsScore = 0;
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            console.log('📐 CLS:', clsScore);
          }
        });
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.log('CLS tracking not supported');
    }
  }

  /**
   * วัดเวลา Execution ของฟังก์ชัน
   * @param {string} label - ชื่อ Label
   * @param {function} callback - ฟังก์ชันที่ต้องวัด
   * @returns {any} - ผลลัพธ์จากฟังก์ชัน
   */
  static measureTime(label, callback) {
    const start = performance.now();
    const result = callback();
    const end = performance.now();
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  /**
   * แสดง Navigation Timing
   */
  static logNavigationTiming() {
    if (performance.timing && performance.navigation.type === 0) {
      const timing = performance.timing;
      const metrics = {
        'DNS Lookup': timing.domainLookupEnd - timing.domainLookupStart,
        'TCP Connection': timing.connectEnd - timing.connectStart,
        'Time to First Byte': timing.responseStart - timing.navigationStart,
        'DOM Processing': timing.domComplete - timing.domLoading,
        'Load Complete': timing.loadEventEnd - timing.navigationStart
      };
      
      console.log('🌐 Navigation Timing:', metrics);
    }
  }
}

// ============ DOM Utilities ============
class DOMUtils {
  /**
   * ค้นหา Element
   * @param {string} selector - CSS Selector
   * @returns {Element|null}
   */
  static $(selector) {
    return document.querySelector(selector);
  }

  /**
   * ค้นหา Elements หลายตัว
   * @param {string} selector - CSS Selector
   * @returns {NodeList}
   */
  static $$(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * เพิ่ม Class
   * @param {string} selector - CSS Selector
   * @param {string} className - Class Name
   */
  static addClass(selector, className) {
    const element = this.$(selector);
    if (element) element.classList.add(className);
  }

  /**
   * ลบ Class
   * @param {string} selector - CSS Selector
   * @param {string} className - Class Name
   */
  static removeClass(selector, className) {
    const element = this.$(selector);
    if (element) element.classList.remove(className);
  }

  /**
   * Toggle Class
   * @param {string} selector - CSS Selector
   * @param {string} className - Class Name
   */
  static toggleClass(selector, className) {
    const element = this.$(selector);
    if (element) element.classList.toggle(className);
  }

  /**
   * ตั้งค่า Attribute
   * @param {string} selector - CSS Selector
   * @param {object} attributes - Attributes Object
   */
  static setAttribute(selector, attributes) {
    const element = this.$(selector);
    if (element) {
      Object.keys(attributes).forEach(key => {
        element.setAttribute(key, attributes[key]);
      });
    }
  }

  /**
   * ดึง Attribute
   * @param {string} selector - CSS Selector
   * @param {string} attribute - Attribute Name
   * @returns {string|null}
   */
  static getAttribute(selector, attribute) {
    const element = this.$(selector);
    return element ? element.getAttribute(attribute) : null;
  }

  /**
   * ตั้งค่า Inner HTML
   * @param {string} selector - CSS Selector
   * @param {string} html - HTML String
   */
  static setHTML(selector, html) {
    const element = this.$(selector);
    if (element) element.innerHTML = html;
  }

  /**
   * ตั้งค่า Text Content
   * @param {string} selector - CSS Selector
   * @param {string} text - Text String
   */
  static setText(selector, text) {
    const element = this.$(selector);
    if (element) element.textContent = text;
  }
}

// ============ Add CSS Animations to Document ============
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(400px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(400px);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      #notification-container {
        left: 10px !important;
        right: 10px !important;
        max-width: none !important;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    }
  `;
  document.head.appendChild(style);
}

// ============ Export for use ============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CSRFTokenManager,
    RateLimiter,
    InputValidator,
    NotificationManager,
    PerformanceMonitor,
    SecureStorage,
    FunctionUtils,
    DOMUtils,
    csrfTokenManager,
    notificationManager,
    secureStorage,
    loginRateLimiter,
    signupRateLimiter
  };
}

// ============ Global Window Exports ============
window.utils = {
  csrf: csrfTokenManager,
  notify: notificationManager,
  storage: secureStorage,
  validate: InputValidator,
  loginLimiter: loginRateLimiter,
  signupLimiter: signupRateLimiter,
  debounce: FunctionUtils.debounce,
  throttle: FunctionUtils.throttle,
  delay: FunctionUtils.delay,
  retry: FunctionUtils.retry,
  dom: DOMUtils,
  performance: PerformanceMonitor
};
