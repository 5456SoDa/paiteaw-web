/**
 * ============ PROFILE MENU ENHANCEMENT V2 ============
 * Updated menu items: Oil price + About + Settings
 */

const ProfileMenuGenerator = {
  /**
   * Generate New Profile Menu with Updated Items
   */
  generateNewProfileMenu(user) {
    return `
      <div class="profile-card">
        <div class="profile-header">
          <img src="${user.photoURL || 'https://i.postimg.cc/3wB0kP0D/default-avatar.png'}" alt="${user.displayName}" class="profile-avatar">
          <div class="profile-info">
            <h3 class="profile-name">${user.displayName || 'ผู้ใช้'}</h3>
            <p class="profile-email">${user.email || 'ไม่มี'}</p>
          </div>
        </div>

        <hr class="profile-divider">

        <div class="profile-menu-grid">
          <a href="dashboard.html" class="menu-item">
            <span class="material-symbols-outlined">dashboard</span>
            <span class="menu-label">แดชบอร์ด</span>
          </a>
          <a href="map.html" class="menu-item">
            <span class="material-symbols-outlined">map</span>
            <span class="menu-label">แผนที่</span>
          </a>
          <a href="places.html" class="menu-item">
            <span class="material-symbols-outlined">location_on</span>
            <span class="menu-label">สถานที่</span>
          </a>
          <a href="wt.html" class="menu-item">
            <span class="material-symbols-outlined">cloud</span>
            <span class="menu-label">อากาศ</span>
          </a>
          <!-- Changed from: บ้านพัก → ราคาน้ำมัน -->
          <a href="oil.html" class="menu-item">
            <span class="material-symbols-outlined">local_gas_station</span>
            <span class="menu-label">น้ำมัน</span>
          </a>
          <!-- Changed from: โปรไฟล์ → เกี่ยวกับ -->
          <a href="#" class="menu-item" onclick="openAboutModal(); closeProfileMenu();">
            <span class="material-symbols-outlined">info</span>
            <span class="menu-label">เกี่ยวกับ</span>
          </a>
          <!-- Changed from: ตั้งค่า (now opens settings) -->
          <a href="#" class="menu-item" onclick="openSettingsModal(); closeProfileMenu();">
            <span class="material-symbols-outlined">settings</span>
            <span class="menu-label">ตั้งค่า</span>
          </a>
          <a href="#logout" class="menu-item logout-btn" onclick="handleLogout(); closeProfileMenu();">
            <span class="material-symbols-outlined">logout</span>
            <span class="menu-label">ออก</span>
          </a>
        </div>

        <hr class="profile-divider">

        <a href="#" class="profile-logout-link" onclick="handleLogout(); closeProfileMenu();">
          <span class="material-symbols-outlined">logout</span>
          <span>ออกจากระบบ</span>
        </a>
      </div>
    `;
  },

  /**
   * Show Profile Menu as Modal
   */
  showProfileMenu(user) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'profile-menu-overlay';
    overlay.id = 'profileMenuOverlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeProfileMenu();
    };

    // Create container
    const container = document.createElement('div');
    container.className = 'profile-menu-container';
    container.innerHTML = this.generateNewProfileMenu(user);

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Animate in
    setTimeout(() => {
      overlay.classList.add('show');
      container.classList.add('show');
    }, 10);
  },

  /**
   * Generate New Profile Menu
   */
  generateNewProfileMenu(user) {
    return `
      <div class="profile-card">
        <div class="profile-header">
          <img src="${user.photoURL || 'https://i.postimg.cc/3wB0kP0D/default-avatar.png'}" alt="${user.displayName}" class="profile-avatar">
          <div class="profile-info">
            <h3 class="profile-name">${user.displayName || 'ผู้ใช้'}</h3>
            <p class="profile-email">${user.email || 'ไม่มี'}</p>
          </div>
        </div>

        <hr class="profile-divider">

        <div class="profile-menu-grid">
          <a href="dashboard.html" class="menu-item">
            <span class="material-symbols-outlined">dashboard</span>
            <span class="menu-label">แดชบอร์ด</span>
          </a>
          <a href="map.html" class="menu-item">
            <span class="material-symbols-outlined">map</span>
            <span class="menu-label">แผนที่</span>
          </a>
          <a href="places.html" class="menu-item">
            <span class="material-symbols-outlined">location_on</span>
            <span class="menu-label">สถานที่</span>
          </a>
          <a href="wt.html" class="menu-item">
            <span class="material-symbols-outlined">cloud</span>
            <span class="menu-label">อากาศ</span>
          </a>
          <a href="oil.html" class="menu-item">
            <span class="material-symbols-outlined">local_gas_station</span>
            <span class="menu-label">น้ำมัน</span>
          </a>
          <a href="#" class="menu-item" onclick="event.preventDefault(); openAboutModal(); ProfileMenuGenerator.closeProfileMenu();">
            <span class="material-symbols-outlined">info</span>
            <span class="menu-label">เกี่ยวกับ</span>
          </a>
          <a href="#" class="menu-item" onclick="event.preventDefault(); openSettingsModal(); ProfileMenuGenerator.closeProfileMenu();">
            <span class="material-symbols-outlined">settings</span>
            <span class="menu-label">ตั้งค่า</span>
          </a>
          <a href="#" class="menu-item logout-btn" onclick="event.preventDefault(); handleLogout(); ProfileMenuGenerator.closeProfileMenu();">
            <span class="material-symbols-outlined">logout</span>
            <span class="menu-label">ออก</span>
          </a>
        </div>

        <hr class="profile-divider">

        <a href="#" class="profile-logout-link" onclick="event.preventDefault(); handleLogout(); ProfileMenuGenerator.closeProfileMenu();">
          <span class="material-symbols-outlined">logout</span>
          <span>ออกจากระบบ</span>
        </a>
      </div>
    `;
  },

  /**
   * Close Profile Menu
   */
  closeProfileMenu() {
    const overlay = document.querySelector('.profile-menu-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  }
};

// Make closeProfileMenu accessible
window.closeProfileMenu = () => ProfileMenuGenerator.closeProfileMenu();

// Export
window.ProfileMenuGenerator = ProfileMenuGenerator;
