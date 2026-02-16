/**
 * ============ TRIP MANAGER ============
 * จัดการข้อมูลทริป (Load, Filter, Calculate, Create, Delete)
 */
class TripManager {
  constructor(db, storage) {
    this.db = db;
    this.storage = storage;
    this.trips = [];
  }

  async loadTrips(userId) {
    try {
      const { getDocs, query, collection, where, orderBy, limit } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );
      
      const q = query(
        collection(this.db, 'trips'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      this.trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return this.trips;
    } catch (error) {
      console.error('Error loading trips:', error);
      throw error;
    }
  }

  getFilteredTrips(searchQuery = '', status = '') {
    return this.trips.filter(trip => {
      const matchSearch =
        trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase());

      const endDate = new Date(trip.endDate.seconds * 1000);
      const now = new Date();

      let tripStatus = 'planning';
      if (endDate < now) tripStatus = 'completed';
      else if (new Date(trip.startDate.seconds * 1000) <= now) tripStatus = 'ongoing';

      return matchSearch && (!status || tripStatus === status);
    });
  }

  calculateStats() {
    let totalBudget = 0;
    let totalExpenses = 0;
    let activeTrips = 0;
    const now = new Date();

    this.trips.forEach(trip => {
      const endDate = new Date(trip.endDate.seconds * 1000);
      if (endDate > now) activeTrips++;
      totalBudget += trip.budget || 0;
      totalExpenses += trip.spent || 0;
    });

    return {
      totalTrips: this.trips.length,
      totalExpenses,
      activeTrips,
      remainingBudget: Math.max(0, totalBudget - totalExpenses)
    };
  }

  getRecentTrips(count = 3) {
    return this.trips.slice(0, count);
  }

  async createTrip(tripData, userId) {
    try {
      const { addDoc, collection, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      const tripWithMetadata = {
        ...tripData,
        userId,
        spent: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(this.db, 'trips'), tripWithMetadata);
      return docRef.id;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  }

  async deleteTrip(tripId) {
    try {
      const { deleteDoc, doc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      await deleteDoc(doc(this.db, 'trips', tripId));
      this.trips = this.trips.filter(t => t.id !== tripId);
      return true;
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  }

  async uploadTripImage(file, userId) {
    try {
      const { ref, uploadBytes, getDownloadURL } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
      );

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const storageRef = ref(this.storage, `trip-images/${userId}/${Date.now()}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  getTrip(tripId) {
    return this.trips.find(t => t.id === tripId);
  }

  getTripsByStatus(status) {
    const now = new Date();
    return this.trips.filter(trip => {
      const endDate = new Date(trip.endDate.seconds * 1000);
      let tripStatus = 'planning';
      if (endDate < now) tripStatus = 'completed';
      else if (new Date(trip.startDate.seconds * 1000) <= now) tripStatus = 'ongoing';
      return tripStatus === status;
    });
  }
}

/**
 * ============ EXPENSE MANAGER ============
 * จัดการข้อมูลค่าใช้จ่าย (Load, Filter, Create, Delete, Calculate)
 */
class ExpenseManager {
  constructor(db) {
    this.db = db;
    this.expenses = [];
  }

  async loadExpenses(userId) {
    try {
      const { getDocs, query, collection, where, orderBy, limit } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      const q = query(
        collection(this.db, 'expenses'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      this.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return this.expenses;
    } catch (error) {
      console.error('Error loading expenses:', error);
      throw error;
    }
  }

  getFilteredExpenses(tripId = '', category = '') {
    return this.expenses.filter(exp => {
      return (!tripId || exp.tripId === tripId) &&
             (!category || exp.category === category);
    });
  }

  async createExpense(expenseData, userId) {
    try {
      const { addDoc, collection, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      const expenseWithMetadata = {
        ...expenseData,
        userId,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(this.db, 'expenses'), expenseWithMetadata);
      return docRef.id;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId) {
    try {
      const { deleteDoc, doc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      await deleteDoc(doc(this.db, 'expenses', expenseId));
      this.expenses = this.expenses.filter(e => e.id !== expenseId);
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  getExpensesByTrip(tripId) {
    return this.expenses.filter(e => e.tripId === tripId);
  }

  calculateTripSpending(tripId) {
    return this.getExpensesByTrip(tripId).reduce((sum, e) => sum + e.amount, 0);
  }

  getExpensesByCategory(tripId, category) {
    return this.getExpensesByTrip(tripId).filter(e => e.category === category);
  }

  getTotalByCategory(tripId) {
    const expenses = this.getExpensesByTrip(tripId);
    const categoryData = {};

    expenses.forEach(exp => {
      categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
    });

    return categoryData;
  }
}

/**
 * ============ ANALYTICS MANAGER ============
 * วิเคราะห์ข้อมูลค่าใช้จ่ายและทริป
 */
class AnalyticsManager {
  constructor(expenses) {
    this.expenses = expenses;
  }

  getCategoryData(tripId) {
    const expenses = this.expenses.filter(e => e.tripId === tripId);
    const categoryData = {};

    expenses.forEach(exp => {
      categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
    });

    return categoryData;
  }

  getDailyData(tripId) {
    const expenses = this.expenses.filter(e => e.tripId === tripId);
    const dailyData = {};

    expenses.forEach(exp => {
      const date = new Date(exp.date.seconds * 1000).toLocaleDateString('th-TH');
      dailyData[date] = (dailyData[date] || 0) + exp.amount;
    });

    return dailyData;
  }

  getTopExpenses(tripId, limit = 5) {
    return this.expenses
      .filter(e => e.tripId === tripId)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  getTripSummary(trip, expenses) {
    const tripExpenses = expenses.filter(e => e.tripId === trip.id);
    const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;

    return {
      tripId: trip.id,
      tripName: trip.name,
      budget: trip.budget,
      spent: totalSpent,
      remaining: Math.max(0, trip.budget - totalSpent),
      percentage: Math.min(percentage, 100),
      expenses: tripExpenses.length
    };
  }

  getAverageDaily(tripId) {
    const trip = window.tripManager?.trips.find(t => t.id === tripId);
    if (!trip) return 0;

    const totalSpent = this.expenses
      .filter(e => e.tripId === tripId)
      .reduce((sum, e) => sum + e.amount, 0);

    const startDate = new Date(trip.startDate.seconds * 1000);
    const endDate = new Date(trip.endDate.seconds * 1000);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

    return totalSpent / days;
  }
}

/**
 * ============ VALIDATION MANAGER ============
 * ตรวจสอบและ validate ข้อมูล
 */
class ValidationManager {
  static validateTrip(tripData) {
    const errors = {};

    if (!tripData.name || tripData.name.length < 2) {
      errors.name = 'ชื่อทริปต้องมีอย่างน้อย 2 ตัวอักษร';
    }

    if (!tripData.destination) {
      errors.destination = 'กรุณากรอกสถานที่';
    }

    const startDate = new Date(tripData.startDate);
    const endDate = new Date(tripData.endDate);

    if (!tripData.startDate) {
      errors.startDate = 'กรุณาเลือกวันเริ่มต้น';
    }

    if (!tripData.endDate) {
      errors.endDate = 'กรุณาเลือกวันสิ้นสุด';
    }

    if (startDate > endDate) {
      errors.endDate = 'วันสิ้นสุดต้องเป็นหลังจากวันเริ่มต้น';
    }

    if (!tripData.budget || tripData.budget <= 0) {
      errors.budget = 'งบประมาณต้องมากกว่า 0';
    }

    if (!tripData.type) {
      errors.type = 'กรุณาเลือกประเภททริป';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static validateExpense(expenseData) {
    const errors = {};

    if (!expenseData.tripId) {
      errors.tripId = 'กรุณาเลือกทริป';
    }

    if (!expenseData.category) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }

    if (!expenseData.amount || expenseData.amount <= 0) {
      errors.amount = 'จำนวนเงินต้องมากกว่า 0';
    }

    if (!expenseData.date) {
      errors.date = 'กรุณาเลือกวันที่';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export classes
window.TripManager = TripManager;
window.ExpenseManager = ExpenseManager;
window.AnalyticsManager = AnalyticsManager;
window.ValidationManager = ValidationManager;
