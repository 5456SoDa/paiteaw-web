/**
 * ============ UI GENERATOR ============
 * สร้าง UI Elements โดยแยกจาก Logic
 */

const UIGenerator = {
  /**
   * Generate Trip Card
   */
  generateTripCard(trip, typeIcons) {
    const startDate = new Date(trip.startDate.seconds * 1000);
    const endDate = new Date(trip.endDate.seconds * 1000);
    const now = new Date();

    let status = '🔵 วางแผน';
    if (endDate < now) status = '✅ เสร็จแล้ว';
    else if (startDate <= now) status = '🟢 กำลังใช้';

    const percentage = trip.budget > 0 ? (trip.spent / trip.budget) * 100 : 0;
    const statusColor = percentage >= 100 ? 'text-red-600' : percentage >= 75 ? 'text-amber-600' : 'text-green-600';
    const tripImage = trip.image || this.getRandomTripImage();
    const typeIcon = typeIcons[trip.type] || '🗺️';

    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition animate-slide-in">
        <div class="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          <img src="${tripImage}" alt="${trip.name}" class="w-full h-full object-cover" onerror="this.src='${this.getRandomTripImage()}'">
          <span class="absolute top-3 right-3 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium">${status}</span>
          
          <!-- DROPDOWN MENU -->
          <div class="absolute top-3 left-3">
            <button type="button" onclick="toggleTripMenu(this)" class="ripple-btn p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <span class="material-symbols-outlined text-gray-700 dark:text-gray-300">more_vert</span>
            </button>
            <div class="trip-dropdown hidden">
              <button onclick="viewTripDetails('${trip.id}')" class="trip-dropdown-item">
                <span class="material-symbols-outlined text-sm">info</span>
                <span>รายละเอียด</span>
              </button>
              <button onclick="editTrip('${trip.id}')" class="trip-dropdown-item">
                <span class="material-symbols-outlined text-sm">edit</span>
                <span>แก้ไข</span>
              </button>
              <button onclick="shareTrip('${trip.id}')" class="trip-dropdown-item">
                <span class="material-symbols-outlined text-sm">share</span>
                <span>แชร์</span>
              </button>
              <button onclick="deleteTrip('${trip.id}')" class="trip-dropdown-item delete">
                <span class="material-symbols-outlined text-sm">delete</span>
                <span>ลบ</span>
              </button>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-bold text-lg">${trip.name}</h3>
            <span class="text-xl">${typeIcon}</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">📍 ${trip.destination}</p>
          <p class="text-xs text-gray-500 mt-1">${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}</p>
          
          <div class="mt-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-600 dark:text-gray-400">งบประมาณ</span>
              <span class="font-semibold ${statusColor}">฿${trip.spent.toLocaleString('th-TH')} / ฿${trip.budget.toLocaleString('th-TH')}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generate Expense Item
   */
  generateExpenseItem(expense, trips, categoryIcons) {
    const date = new Date(expense.date.seconds * 1000).toLocaleDateString('th-TH');
    const tripName = trips.find(t => t.id === expense.tripId)?.name || '-';
    const icon = categoryIcons[expense.category] || '📌';

    return `
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border hover:shadow-md transition expense-item flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="text-2xl">${icon}</div>
          <div class="flex-1">
            <p class="font-semibold">${expense.description || 'ไม่มีรายละเอียด'}</p>
            <p class="text-sm text-gray-500">${tripName} • ${date}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold">฿${expense.amount.toLocaleString('th-TH')}</p>
          <button onclick="deleteExpense('${expense.id}')" class="text-xs text-red-600 hover:text-red-700 ripple-btn">ลบ</button>
        </div>
      </div>
    `;
  },

  /**
   * Generate Stat Card
   */
  generateStatCard(label, value, icon) {
    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition">
        <p class="text-sm text-gray-600 dark:text-gray-400">${label}</p>
        <p class="text-3xl font-bold mt-2">${value}</p>
        <span class="text-4xl absolute top-4 right-4 opacity-20">${icon}</span>
      </div>
    `;
  },

  /**
   * Generate Recent Trip Card
   */
  generateRecentTripCard(trip) {
    const percentage = trip.budget > 0 ? (trip.spent / trip.budget) * 100 : 0;
    const tripImage = trip.image || this.getRandomTripImage();

    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border hover:shadow-lg transition animate-slide-in">
        <img src="${tripImage}" alt="${trip.name}" class="w-full h-48 object-cover" onerror="this.src='${this.getRandomTripImage()}'">
        <div class="p-4">
          <h3 class="font-bold text-lg">${trip.name}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">📍 ${trip.destination}</p>
          
          <div class="mt-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-600 dark:text-gray-400">งบประมาณ</span>
              <span class="font-semibold">฿${trip.spent.toLocaleString('th-TH')} / ฿${trip.budget.toLocaleString('th-TH')}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generate Error Message
   */
  generateErrorMessage(fieldName, message) {
    return `<p id="${fieldName}Error" class="error-message">${message}</p>`;
  },

  /**
   * Show Error
   */
  showError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    if (errorEl) {
      errorEl.textContent = message;
    }
  },

  /**
   * Clear Errors
   */
  clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
    });
  },

  /**
   * Get Random Trip Image
   */
  getRandomTripImage() {
    const images = [
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1521671413015-74d440642117?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1530521954734-43fcb99ff981?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1532274040911-5f82f5b51c3f?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1456731190519-04a7bf12313f?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=300&fit=crop'
    ];
    return images[Math.floor(Math.random() * images.length)];
  },

  /**
   * Update Stats Display
   */
  updateStats(stats) {
    document.getElementById('stat-total-trips').textContent = stats.totalTrips;
    document.getElementById('stat-total-expenses').textContent = `฿${stats.totalExpenses.toLocaleString('th-TH')}`;
    document.getElementById('stat-active-trips').textContent = stats.activeTrips;
    document.getElementById('stat-remaining-budget').textContent = `฿${stats.remainingBudget.toLocaleString('th-TH')}`;
  },

  /**
   * Populate Select Options
   */
  populateSelectOptions(selectId, trips, defaultText = 'เลือกทริป...') {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">${defaultText}</option>`;
    trips.forEach(trip => {
      const option = document.createElement('option');
      option.value = trip.id;
      option.textContent = trip.name;
      select.appendChild(option);
    });
  },

  /**
   * Show Loading Bar
   */
  showLoadingBar() {
    const bar = document.getElementById('loadingBar');
    bar.style.width = '30%';
    setTimeout(() => bar.style.width = '60%', 200);
  },

  /**
   * Hide Loading Bar
   */
  hideLoadingBar() {
    const bar = document.getElementById('loadingBar');
    bar.style.width = '100%';
    setTimeout(() => bar.style.width = '0%', 300);
  }
};

// Export
window.UIGenerator = UIGenerator;
