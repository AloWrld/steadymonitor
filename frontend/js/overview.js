
export async function loadDashboardData() {
  try {
    const [stats, lowStock, recentSales, customerBalances] = await Promise.all([
      getDashboardStats(),
      getLowStockItems(),
      apiCall(dashboardAPI.getRecentSales),
      apiCall(dashboardAPI.pos.customer.getBalances)
    ]);
    
    return { stats, lowStock, recentSales, customerBalances };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}
