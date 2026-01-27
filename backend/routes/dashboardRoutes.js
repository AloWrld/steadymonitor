const express = require('express');
const router = express.Router();
//const dashboardService = require('../services/dashboardService');

// GET dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// GET low stock items
router.get('/low-stock', async (req, res) => {
    try {
        const lowStock = await dashboardService.getLowStockItems();
        res.json(lowStock);
    } catch (error) {
        console.error('Error fetching low stock items:', error);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});

// GET recent sales
router.get('/recent-sales', async (req, res) => {
    try {
        const recentSales = await dashboardService.getRecentSales();
        res.json(recentSales);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ error: 'Failed to fetch recent sales' });
    }
});

// GET customer balances
router.get('/customers-balance', async (req, res) => {
    try {
        const balances = await dashboardService.getCustomerBalances();
        res.json(balances);
    } catch (error) {
        console.error('Error fetching customer balances:', error);
        res.status(500).json({ error: 'Failed to fetch customer balances' });
    }
});

module.exports = router;