/**
 * ============ EVENT HANDLERS - PHASE 2 & 3 COMPLETE ============
 * จัดการ event listeners, filters, bulk actions, accessibility
 */

// ============ GLOBAL STATE ============
const selectedTrips = new Set();
const selectedExpenses = new Set();

// ============ CREATE TRIP FORM HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const createTripForm = document.getElementById('createTripForm');
  
  if (createTripForm) {
    createTripForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        if (!window.currentUser) {
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้', 2000);
          return;
        }

        UIGenerator.showLoadingBar();
        window.notificationManager?.info?.('กำลังสร้างทริป...', '', 0);

        const tripName = document.getElementById('tripName').value.trim();
        const destination = document.getElementById('destination').value.trim();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const budget = parseFloat(document.getElementById('budget').value);
        const tripType = document.getElementById('tripType').value;
        const description = document.getElementById('tripDescription').value.trim();

        const validation = ValidationManager.validateTrip({
          name: tripName,
          destination,
          startDate,
          endDate,
          budget,
          type: tripType
        });

        if (!validation.isValid) {
          UIGenerator.clearErrors();
          Object.entries(validation.errors).forEach(([field, message]) => {
            UIGenerator.showError(field, message);
          });
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน', 3000);
          UIGenerator.hideLoadingBar();
          return;
        }

        let imageUrl = '';
        const imageInput = document.getElementById('tripImageInput');
        if (imageInput && imageInput.files.length > 0) {
          try {
            const file = imageInput.files[0];
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = async () => {
              const maxWidth = 800;
              const maxHeight = 600;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob(async (blob) => {
                try {
                  const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                  imageUrl = await window.tripManager.uploadTripImage(compressedFile, window.currentUser.uid);
                  await createTripData(tripName, destination, startDate, endDate, budget, tripType, description, imageUrl);
                } catch (error) {
                  console.error('Image upload error:', error);
                  window.notificationManager?.warning?.('ไม่สามารถอัปโหลดรูปภาพ', 'แต่ทริปจะยังสร้างได้', 2000);
                  await createTripData(tripName, destination, startDate, endDate, budget, tripType, description, '');
                }
              }, 'image/jpeg', 0.8);
            };
            
            img.src = URL.createObjectURL(file);
          } catch (error) {
            console.error('Image processing error:', error);
            window.notificationManager?.warning?.('ไม่สามารถประมวลผลรูปภาพ', 'แต่ทริปจะยังสร้างได้', 2000);
            await createTripData(tripName, destination, startDate, endDate, budget, tripType, description, '');
          }
        } else {
          await createTripData(tripName, destination, startDate, endDate, budget, tripType, description, '');
        }
        
        async function createTripData(name, dest, start, end, bud, type, desc, imgUrl) {
          try {
            const tripData = {
              name: name,
              destination: dest,
              startDate: new Date(start),
              endDate: new Date(end),
              budget: bud,
              type: type,
              description: desc,
              image: imgUrl
            };

            const tripId = await window.tripManager.createTrip(tripData, window.currentUser.uid);

            createTripForm.reset();
            UIGenerator.clearErrors();
            document.getElementById('imagePreviewArea').style.display = 'block';
            document.getElementById('imagePreview').style.display = 'none';

            window.closeCreateTripModal();

            const trips = await window.tripManager.loadTrips(window.currentUser.uid);
            
            UIGenerator.populateSelectOptions('expenseTrip', trips, 'เลือกทริป...');
            UIGenerator.populateSelectOptions('expenseFilterTrip', trips, '-- ทั้งหมด --');
            UIGenerator.populateSelectOptions('analyticsTrip', trips, '-- เลือกทริป --');
            
            if (window.renderTripsList) {
              window.renderTripsList(trips);
            }
            if (window.renderRecentTrips) {
              window.renderRecentTrips(trips.slice(0, 3));
            }

            const stats = window.tripManager.calculateStats();
            UIGenerator.updateStats(stats);

            window.notificationManager?.success?.('สร้างทริปสำเร็จ!', `"${name}" ถูกสร้างแล้ว`, 2000);
            
            UIGenerator.hideLoadingBar();
          } catch (error) {
            console.error('Create trip error:', error);
            window.notificationManager?.error?.('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างทริปได้', 3000);
            UIGenerator.hideLoadingBar();
          }
        }

      } catch (error) {
        console.error('Create trip handler error:', error);
        window.notificationManager?.error?.('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้างทริปได้', 3000);
        UIGenerator.hideLoadingBar();
      }
    });
  }
});

// ============ ADD EXPENSE FORM HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const addExpenseForm = document.getElementById('addExpenseForm');
  
  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        if (!window.currentUser) {
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้', 2000);
          return;
        }

        UIGenerator.showLoadingBar();
        window.notificationManager?.info?.('กำลังเพิ่มค่าใช้จ่าย...', '', 0);

        const tripId = document.getElementById('expenseTrip').value;
        const category = document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;
        const description = document.getElementById('expenseDescription').value.trim();

        const validation = ValidationManager.validateExpense({
          tripId,
          category,
          amount,
          date
        });

        if (!validation.isValid) {
          UIGenerator.clearErrors();
          Object.entries(validation.errors).forEach(([field, message]) => {
            const errorEl = document.getElementById(`${field}Error`);
            if (errorEl) {
              errorEl.textContent = message;
            }
          });
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน', 3000);
          UIGenerator.hideLoadingBar();
          return;
        }

        const expenseData = {
          tripId,
          category,
          amount,
          date: new Date(date),
          description
        };

        await window.expenseManager.createExpense(expenseData, window.currentUser.uid);

        addExpenseForm.reset();
        UIGenerator.clearErrors();

        window.closeAddExpenseModal();

        const expenses = await window.expenseManager.loadExpenses(window.currentUser.uid);
        window.analyticsManager.expenses = expenses;

        if (window.renderExpensesList) {
          window.renderExpensesList(expenses);
        }

        window.notificationManager?.success?.('เพิ่มค่าใช้จ่ายสำเร็จ!', `฿${amount.toLocaleString('th-TH')} ถูกเพิ่มแล้ว`, 2000);

      } catch (error) {
        console.error('Add expense error:', error);
        window.notificationManager?.error?.('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเพิ่มค่าใช้จ่ายได้', 3000);
      } finally {
        UIGenerator.hideLoadingBar();
      }
    });
  }
});

// ============ CHANGE PASSWORD FORM HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const changePasswordForm = document.getElementById('changePasswordForm');
  
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        document.getElementById('currentPasswordError').textContent = '';
        document.getElementById('newPasswordError').textContent = '';
        document.getElementById('confirmPasswordError').textContent = '';

        let hasError = false;

        if (!currentPassword) {
          document.getElementById('currentPasswordError').textContent = 'กรุณากรอกรหัสผ่านปัจจุบัน';
          hasError = true;
        }

        if (!newPassword || newPassword.length < 6) {
          document.getElementById('newPasswordError').textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
          hasError = true;
        }

        if (newPassword !== confirmPassword) {
          document.getElementById('confirmPasswordError').textContent = 'รหัสผ่านไม่ตรงกัน';
          hasError = true;
        }

        if (hasError) {
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'กรุณาตรวจสอบข้อมูลอีกครั้ง', 2000);
          return;
        }

        window.notificationManager?.info?.('กำลังเปลี่ยนรหัสผ่าน...', '', 0);

        const { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import(
          'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
        );

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user || !user.email) {
          throw new Error('ไม่พบผู้ใช้');
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);

        changePasswordForm.reset();

        window.notificationManager?.success?.('เปลี่ยนรหัสผ่านสำเร็จ!', 'รหัสผ่านของคุณได้รับการอัปเดตแล้ว', 2000);

      } catch (error) {
        console.error('Change password error:', error);
        
        let errorMessage = 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
        if (error.message.includes('auth/wrong-password')) {
          errorMessage = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
          document.getElementById('currentPasswordError').textContent = errorMessage;
        } else if (error.message.includes('auth/weak-password')) {
          errorMessage = 'รหัสผ่านใหม่อ่อนแอเกินไป';
          document.getElementById('newPasswordError').textContent = errorMessage;
        }

        window.notificationManager?.error?.('เกิดข้อผิดพลาด', errorMessage, 3000);
      }
    });
  }
});

// ============ AVATAR UPLOAD HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const avatarInput = document.getElementById('avatarInput');
  
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        if (!file.type.startsWith('image/')) {
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', 2000);
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ขนาดไฟล์ต้องน้อยกว่า 5MB', 2000);
          return;
        }

        window.notificationManager?.info?.('กำลังอัปโหลดรูปภาพ...', '', 0);

        const { getAuth, updateProfile } = await import(
          'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
        );
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import(
          'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'
        );

        const auth = getAuth();
        const storage = getStorage();
        const user = auth.currentUser;

        if (!user) {
          throw new Error('ไม่พบผู้ใช้');
        }

        const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        await updateProfile(user, {
          photoURL: downloadURL
        });

        document.getElementById('settingsAvatar').src = downloadURL;
        document.getElementById('profileAvatar').src = downloadURL;

        window.notificationManager?.success?.('อัปโหลดสำเร็จ!', 'รูปโปรไฟล์ของคุณได้รับการอัปเดตแล้ว', 2000);

      } catch (error) {
        console.error('Avatar upload error:', error);
        window.notificationManager?.error?.('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถอัปโหลดรูปภาพได้', 3000);
      }
    });
  }
});

// ============ IMAGE PREVIEW HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('tripImageInput');
  
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', 2000);
        imageInput.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ขนาดไฟล์ต้องน้อยกว่า 5MB', 2000);
        imageInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imagePreview = document.getElementById('imagePreview');
        const imagePreviewArea = document.getElementById('imagePreviewArea');
        
        if (imagePreview && imagePreviewArea) {
          imagePreview.src = event.target.result;
          imagePreviewArea.style.display = 'none';
          imagePreview.style.display = 'block';
          window.notificationManager?.success?.('อัปโหลดรูปสำเร็จ', 'พร้อมสร้างทริป', 2000);
        }
      };
      reader.readAsDataURL(file);
    });
  }
});

// ============ TRIP STATUS FILTER HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const tripStatusFilter = document.getElementById('tripStatusFilter');
  const tripSearch = document.getElementById('tripSearch');
  
  if (tripStatusFilter) {
    tripStatusFilter.addEventListener('change', () => {
      filterAndRenderTrips();
    });
  }
  
  if (tripSearch) {
    tripSearch.addEventListener('input', () => {
      filterAndRenderTrips();
    });
  }
});

window.filterAndRenderTrips = () => {
  const statusFilter = document.getElementById('tripStatusFilter')?.value || '';
  const searchQuery = document.getElementById('tripSearch')?.value || '';
  
  const filtered = window.tripManager.getFilteredTrips(searchQuery, statusFilter);
  
  if (window.renderTripsList) {
    window.renderTripsList(filtered);
  }
};

window.filterTripsByStatus = (status) => {
  // Update button states
  document.querySelectorAll('.trip-status-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-indigo-600', 'border-indigo-600', 'text-white');
    btn.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
  });
  
  const activeBtn = document.querySelector(`[data-status="${status}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-indigo-600', 'border-indigo-600', 'text-white');
    activeBtn.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
  }
  
  filterAndRenderTrips();
};

// ============ SEARCH HANDLER FOR EXPENSES ============
document.addEventListener('DOMContentLoaded', () => {
  const expenseSearch = document.getElementById('expenseSearch');
  
  if (expenseSearch) {
    expenseSearch.addEventListener('input', () => {
      filterExpensesBySearch();
    });
  }
});

window.filterExpensesBySearch = () => {
  const searchQuery = document.getElementById('expenseSearch')?.value || '';
  const tripFilter = document.getElementById('expenseFilterTrip')?.value || '';
  const categoryFilter = document.getElementById('expenseFilterCategory')?.value || '';
  
  let filtered = window.expenseManager.expenses || [];
  
  if (searchQuery) {
    filtered = filtered.filter(e => 
      (e.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
  
  if (tripFilter) {
    filtered = filtered.filter(e => e.tripId === tripFilter);
  }
  
  if (categoryFilter) {
    filtered = filtered.filter(e => e.category === categoryFilter);
  }
  
  if (window.renderExpensesList) {
    window.renderExpensesList(filtered);
  }
};

// ============ UPDATE FILTER HANDLERS ============
document.addEventListener('DOMContentLoaded', () => {
  const expenseFilterTrip = document.getElementById('expenseFilterTrip');
  const expenseFilterCategory = document.getElementById('expenseFilterCategory');
  
  if (expenseFilterTrip) {
    expenseFilterTrip.addEventListener('change', () => {
      filterExpensesBySearch();
    });
  }
  
  if (expenseFilterCategory) {
    expenseFilterCategory.addEventListener('change', () => {
      filterExpensesBySearch();
    });
  }
});

// ============ ANALYTICS FILTER HANDLER ============
document.addEventListener('DOMContentLoaded', () => {
  const analyticsTrip = document.getElementById('analyticsTrip');
  
  if (analyticsTrip) {
    analyticsTrip.addEventListener('change', () => {
      updateAnalyticsCharts();
    });
  }
});

window.updateAnalyticsCharts = () => {
  const tripId = document.getElementById('analyticsTrip')?.value;
  if (!tripId) {
    window.notificationManager?.warning?.('เลือกทริป', 'กรุณาเลือกทริปเพื่อดูการวิเคราะห์', 2000);
    return;
  }

  const categoryData = window.analyticsManager.getCategoryData(tripId);
  const dailyData = window.analyticsManager.getDailyData(tripId);

  // Update category chart
  const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
  if (categoryCtx) {
    if (window.categoryChartInstance) {
      window.categoryChartInstance.destroy();
    }

    window.categoryChartInstance = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          data: Object.values(categoryData),
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
            }
          }
        }
      }
    });
  }

  // Update daily chart
  const dailyCtx = document.getElementById('dailyChart')?.getContext('2d');
  if (dailyCtx) {
    if (window.dailyChartInstance) {
      window.dailyChartInstance.destroy();
    }

    window.dailyChartInstance = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: Object.keys(dailyData),
        datasets: [{
          label: 'ค่าใช้จ่ายรายวัน (฿)',
          data: Object.values(dailyData),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
            }
          }
        },
        scales: {
          y: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            }
          },
          x: {
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            }
          }
        }
      }
    });
  }
};

// ============ TRIP DROPDOWN MENU HANDLER ============
window.toggleTripMenu = (button) => {
  const dropdown = button.nextElementSibling;
  if (!dropdown) return;

  document.querySelectorAll('.trip-dropdown').forEach(menu => {
    if (menu !== dropdown) {
      menu.classList.add('hidden');
    }
  });

  dropdown.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.trip-dropdown') && !e.target.closest('button')) {
    document.querySelectorAll('.trip-dropdown').forEach(menu => {
      menu.classList.add('hidden');
    });
  }
});

// ============ DELETE TRIP HANDLER ============
window.deleteTrip = async (tripId) => {
  if (!confirm('⚠️ ต้องการลบทริปนี้หรือไม่? การกระทำนี้ไม่สามารถกลับได้')) {
    return;
  }

  try {
    window.notificationManager?.info?.('กำลังลบทริป...', '', 0);
    
    await window.tripManager.deleteTrip(tripId);
    
    const trips = await window.tripManager.loadTrips(window.currentUser.uid);
    if (window.renderTripsList) {
      window.renderTripsList(trips);
    }
    if (window.renderRecentTrips) {
      window.renderRecentTrips(trips.slice(0, 3));
    }
    
    window.notificationManager?.success?.('ลบทริปสำเร็จ!', 'ทริปได้ถูกลบแล้ว', 2000);
  } catch (error) {
    console.error('Delete trip error:', error);
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่สามารถลบทริปได้', 3000);
  }
};

// ============ DELETE EXPENSE HANDLER ============
window.deleteExpense = async (expenseId) => {
  if (!confirm('⚠️ ต้องการลบค่าใช้จ่ายนี้หรือไม่?')) {
    return;
  }

  try {
    window.notificationManager?.info?.('กำลังลบค่าใช้จ่าย...', '', 0);
    
    await window.expenseManager.deleteExpense(expenseId);
    
    const expenses = await window.expenseManager.loadExpenses(window.currentUser.uid);
    window.analyticsManager.expenses = expenses;
    
    if (window.renderExpensesList) {
      window.renderExpensesList(expenses);
    }
    
    window.notificationManager?.success?.('ลบค่าใช้จ่ายสำเร็จ!', 'ค่าใช้จ่ายได้ถูกลบแล้ว', 2000);
  } catch (error) {
    console.error('Delete expense error:', error);
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่สามารถลบค่าใช้จ่ายได้', 3000);
  }
};

// ============ VIEW TRIP DETAILS HANDLER ============
window.viewTripDetails = (tripId) => {
  const trip = window.tripManager.getTrip(tripId);
  if (!trip) {
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลทริป', 2000);
    return;
  }

  window.notificationManager?.info?.('ดูรายละเอียด', `${trip.name} - อยู่ระหว่างพัฒนา`, 2000);
};

// ============ EDIT TRIP HANDLER ============
window.editTrip = (tripId) => {
  const trip = window.tripManager.getTrip(tripId);
  if (!trip) {
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลทริป', 2000);
    return;
  }

  window.notificationManager?.info?.('แก้ไขทริป', `${trip.name} - อยู่ระหว่างพัฒนา`, 2000);
};

// ============ SHARE TRIP HANDLER ============
window.shareTrip = (tripId) => {
  const trip = window.tripManager.getTrip(tripId);
  if (!trip) {
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลทริป', 2000);
    return;
  }

  window.notificationManager?.info?.('แชร์ทริป', `${trip.name} - อยู่ระหว่างพัฒนา`, 2000);
};

// ============ RENDER TRIPS LIST - WITH EMPTY STATE ============
window.renderTripsList = (trips) => {
  const container = document.getElementById('tripsContainer');
  if (!container) return;

  const typeIcons = {
    adventure: '🏕️',
    beach: '🏖️',
    city: '🏙️',
    culture: '🏛️',
    food: '🍜',
    nature: '🌲',
    learn: '📚',
    relax: '🏖️',
    travel: '✈️',
    family: '👨‍👩‍👧‍👦'
  };

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="col-span-full empty-state">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">ยังไม่มีทริป</h3>
        <p class="empty-state-text">กรุณาสร้างทริปใหม่เพื่อเริ่มต้น</p>
        <button onclick="openCreateTripModal()" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg ripple-btn cta-btn">
          + สร้างทริปแรก
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map(trip => UIGenerator.generateTripCard(trip, typeIcons)).join('');
};

// ============ RENDER RECENT TRIPS - PHASE 2 FEATURE ============
window.renderRecentTrips = (trips) => {
  const container = document.getElementById('recent-trips');
  if (!container) return;

  const typeIcons = {
    adventure: '🏕️',
    beach: '🏖️',
    city: '🏙️',
    culture: '🏛️',
    food: '🍜',
    nature: '🌲',
    learn: '📚',
    relax: '🏖️',
    travel: '✈️',
    family: '👨‍👩‍👧‍👦'
  };

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="col-span-full empty-state">
        <div class="empty-state-icon">✈️</div>
        <h3 class="empty-state-title">ยังไม่มีทริปล่าสุด</h3>
        <p class="empty-state-text">สร้างทริปใหม่เพื่อแสดงที่นี่</p>
        <button onclick="openCreateTripModal()" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg ripple-btn cta-btn">
          + สร้างทริป
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map(trip => {
    const percentage = trip.budget > 0 ? (trip.spent / trip.budget) * 100 : 0;
    const tripImage = trip.image || UIGenerator.getRandomTripImage();
    const typeIcon = typeIcons[trip.type] || '🗺️';
    const startDate = new Date(trip.startDate.seconds * 1000);
    const endDate = new Date(trip.endDate.seconds * 1000);
    
    return `
      <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition animate-slide-in recent-trip-card">
        <img src="${tripImage}" alt="${trip.name}" class="w-full h-40 object-cover" onerror="this.src='${UIGenerator.getRandomTripImage()}'">
        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-bold text-sm">${trip.name}</h3>
            <span class="text-lg">${typeIcon}</span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400">📍 ${trip.destination}</p>
          <p class="text-xs text-gray-500 mt-1">${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}</p>
          
          <div class="mt-3">
            <div class="flex justify-between text-xs mb-1">
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
  }).join('');
};

// ============ RENDER EXPENSES LIST - WITH EMPTY STATE ============
window.renderExpensesList = (expenses) => {
  const container = document.getElementById('expensesContainer');
  if (!container) return;

  const categoryIcons = {
    food: '🍽️',
    transport: '🚗',
    accommodation: '🏨',
    activity: '🎭',
    shopping: '🛍️',
    other: '💰'
  };

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-8">
        <div class="empty-state-icon text-3xl">💰</div>
        <h3 class="empty-state-title">ยังไม่มีค่าใช้จ่าย</h3>
        <p class="empty-state-text">เพิ่มค่าใช้จ่ายแรกของคุณ</p>
        <button onclick="openAddExpenseModal()" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg ripple-btn cta-btn">
          + เพิ่มค่าใช้จ่าย
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = expenses.map(expense => 
    UIGenerator.generateExpenseItem(expense, window.tripManager.trips, categoryIcons)
  ).join('');
};

// ============ KEYBOARD SHORTCUTS - PHASE 3 FEATURE ============
document.addEventListener('keydown', (e) => {
  // Ctrl+N (Cmd+N) = Create trip
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openCreateTripModal();
  }
  
  // Ctrl+E (Cmd+E) = Create expense
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    openAddExpenseModal();
  }
  
  // / = Focus search
  if (e.key === '/' && !isInputFocused()) {
    e.preventDefault();
    const searchInput = document.getElementById('tripSearch') || document.getElementById('expenseSearch');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // Esc = Close modal
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

function isInputFocused() {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
}

function closeAllModals() {
  window.closeCreateTripModal?.();
  window.closeAddExpenseModal?.();
  window.closeAboutModal?.();
  window.closeSettingsModal?.();
  window.closeProfileMenu?.();
}

// ============ BULK ACTIONS - PHASE 3 FEATURE ============
window.handleBulkDelete = async (type) => {
  const selectedSet = type === 'trip' ? selectedTrips : selectedExpenses;
  
  if (selectedSet.size === 0) {
    window.notificationManager?.warning?.('ไม่มีรายการ', 'กรุณาเลือกอย่างน้อย 1 รายการ', 2000);
    return;
  }
  
  if (!confirm(`ต้องการลบ ${selectedSet.size} รายการ?`)) {
    return;
  }

  window.notificationManager?.info?.('กำลังลบ...', '', 0);

  try {
    for (const id of selectedSet) {
      if (type === 'trip') {
        await window.tripManager.deleteTrip(id);
      } else {
        await window.expenseManager.deleteExpense(id);
      }
    }

    selectedSet.clear();
    
    if (type === 'trip') {
      const trips = await window.tripManager.loadTrips(window.currentUser.uid);
      window.renderTripsList(trips);
    } else {
      const expenses = await window.expenseManager.loadExpenses(window.currentUser.uid);
      window.renderExpensesList(expenses);
    }

    window.notificationManager?.success?.('ลบสำเร็จ!', `ลบ ${selectedSet.size} รายการแล้ว`, 2000);
  } catch (error) {
    console.error('Bulk delete error:', error);
    window.notificationManager?.error?.('เกิดข้อผิดพลาด', 'ไม่สามารถลบได้', 3000);
  }
};

// ============ TAB NAVIGATION ============
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update button states
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('tab-active', 'text-indigo-600');
        b.classList.add('text-gray-600', 'dark:text-gray-400');
        b.setAttribute('aria-selected', 'false');
      });
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      
      btn.classList.add('tab-active', 'text-indigo-600');
      btn.classList.remove('text-gray-600', 'dark:text-gray-400');
      btn.setAttribute('aria-selected', 'true');
      
      const tabName = btn.dataset.tab;
      const tabContent = document.getElementById(`${tabName}-tab`);
      if (tabContent) {
        tabContent.classList.remove('hidden');
      }
    });
  });
});

// Export
window.eventHandlers = {
  renderTripsList,
  renderRecentTrips,
  renderExpensesList,
  filterAndRenderTrips,
  filterExpensesBySearch,
  updateAnalyticsCharts,
  handleBulkDelete
};
