// backend/routes/allocationRoutes.js
const express = require('express');
const router = express.Router();
const allocationService = require('../services/allocationService');
const { requirePermission } = require('../middleware/authMiddleware');

/**
 * 1. CREATE ALLOCATION (Individual learner)
 * Route: POST /api/allocations
 * Access: Admin + Departments
 */
router.post('/', requirePermission('allocations'), async (req, res) => {
    try {
        const { 
            learner_id, 
            items, 
            program_type,
            allocation_notes = '',
            is_batch = false,
            batch_class = ''
        } = req.body;

        if (!learner_id || !items || items.length === 0 || !program_type) {
            return res.status(400).json({ 
                success: false, 
                message: 'Learner ID, items, and program type are required' 
            });
        }

        if (!['A', 'B'].includes(program_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Program type must be A or B' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff'
        };

        console.log(`📦 Creating Program ${program_type} allocation for learner: ${learner_id} by ${userInfo.userName}`);

        const result = await allocationService.createAllocation({
            learner_id,
            items,
            program_type,
            allocation_notes,
            is_batch,
            batch_class
        }, userInfo);

        res.json({
            success: true,
            message: `Program ${program_type} allocation recorded`,
            ...result
        });

    } catch (error) {
        console.error('❌ Program allocation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record program allocation',
            error: error.message 
        });
    }
});

/**
 * 2. BATCH ALLOCATE TO CLASS
 * Route: POST /api/allocations/batch
 * Access: Admin + Departments
 */
router.post('/batch', requirePermission('allocations'), async (req, res) => {
    try {
        const { 
            class_name, 
            program_type, 
            items,
            allocation_notes = '',
            exclude_learner_ids = []
        } = req.body;

        if (!class_name || !program_type || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Class name, program type, and items are required' 
            });
        }

        if (!['A', 'B'].includes(program_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Program type must be A or B' 
            });
        }

        const userInfo = {
            userName: req.user?.displayName || 'System',
            userRole: req.user?.role || 'staff'
        };

        console.log(`📦 Batch allocating Program ${program_type} to class: ${class_name} by ${userInfo.userName}`);

        const result = await allocationService.batchAllocateToClass({
            class_name,
            program_type,
            items,
            allocation_notes,
            exclude_learner_ids
        }, userInfo);

        res.json({
            success: true,
            message: `Batch allocation to ${class_name} completed`,
            ...result
        });

    } catch (error) {
        console.error('❌ Batch allocation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process batch allocation',
            error: error.message 
        });
    }
});

/**
 * 3. GET LEARNER'S ALLOCATIONS
 * Route: GET /api/allocations/learner/:learnerId
 * Access: Admin + Departments
 */
router.get('/learner/:learnerId', requirePermission('allocations'), async (req, res) => {
    try {
        const { learnerId } = req.params;
        
        console.log(`📋 Getting allocations for learner: ${learnerId}`);

        const allocations = await allocationService.getLearnerAllocations(learnerId);

        // Calculate totals
        const totals = allocations.reduce((acc, alloc) => {
            acc.total_items += parseInt(alloc.quantity) || 0;
            acc.total_value += (parseFloat(alloc.unit_price) || 0) * (parseInt(alloc.quantity) || 0);
            return acc;
        }, { total_items: 0, total_value: 0 });

        res.json({
            success: true,
            learner_id: learnerId,
            total_allocations: allocations.length,
            totals: totals,
            allocations: allocations
        });

    } catch (error) {
        console.error('❌ Get learner allocations error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch learner allocations',
            error: error.message 
        });
    }
});

/**
 * 4. GET ALLOCATIONS BY PROGRAM
 * Route: GET /api/allocations/program/:programType
 * Access: Admin + Departments
 */
router.get('/program/:programType', requirePermission('allocations'), async (req, res) => {
    try {
        const { programType } = req.params;
        const { class: className, start_date, end_date } = req.query;

        if (!['A', 'B'].includes(programType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Program type must be A or B' 
            });
        }

        console.log(`📊 Getting allocations for Program ${programType}`);

        const filters = {
            class_name: className,
            start_date: start_date || null,
            end_date: end_date || null
        };

        const allocations = await allocationService.getAllocationsByProgram(programType, filters);

        // Get summary
        const summary = await allocationService.getAllocationSummary(programType, 'month');

        res.json({
            success: true,
            program_type: programType,
            count: allocations.length,
            allocations: allocations,
            summary: summary,
            filters: filters
        });

    } catch (error) {
        console.error('❌ Get allocations by program error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch allocations',
            error: error.message 
        });
    }
});

/**
 * 5. GET ALLOCATION SUMMARY
 * Route: GET /api/allocations/summary
 * Access: Admin + Departments
 */
router.get('/summary', requirePermission('allocations'), async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        console.log(`📈 Getting allocation summary for period: ${period}`);

        // Get summary for both programs
        const [programASummary, programBSummary] = await Promise.all([
            allocationService.getAllocationSummary('A', period),
            allocationService.getAllocationSummary('B', period)
        ]);

        // Get program summary
        const programSummary = await allocationService.getProgramSummary();

        res.json({
            success: true,
            period: period,
            program_A: {
                count: programASummary.length,
                summary: programASummary
            },
            program_B: {
                count: programBSummary.length,
                summary: programBSummary
            },
            program_summary: programSummary,
            totals: programSummary.reduce((acc, program) => {
                acc.total_learners += parseInt(program.total_learners) || 0;
                acc.total_allocations += parseInt(program.total_allocations) || 0;
                acc.total_items += parseInt(program.total_items) || 0;
                acc.total_value += parseFloat(program.total_value) || 0;
                return acc;
            }, { total_learners: 0, total_allocations: 0, total_items: 0, total_value: 0 })
        });

    } catch (error) {
        console.error('❌ Get allocation summary error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch allocation summary',
            error: error.message 
        });
    }
});

/**
 * 6. GET BATCHES
 * Route: GET /api/allocations/batches
 * Access: Admin + Departments
 */
router.get('/batches', requirePermission('allocations'), async (req, res) => {
    try {
        const { operation_type, program_type, class: className, status } = req.query;

        console.log(`📑 Getting batches`);

        const filters = {
            operation_type: operation_type || null,
            program_type: program_type || null,
            class: className || null,
            status: status || null
        };

        const batches = await allocationService.getBatches(filters);

        res.json({
            success: true,
            count: batches.length,
            filters: filters,
            batches: batches
        });

    } catch (error) {
        console.error('❌ Get batches error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch batches',
            error: error.message 
        });
    }
});

/**
 * 7. GET BATCH DETAILS
 * Route: GET /api/allocations/batch/:batchId
 * Access: Admin + Departments
 */
router.get('/batch/:batchId', requirePermission('allocations'), async (req, res) => {
    try {
        const { batchId } = req.params;

        console.log(`📑 Getting details for batch: ${batchId}`);

        const batchDetails = await allocationService.getBatchDetails(batchId);

        if (!batchDetails) {
            return res.status(404).json({ 
                success: false, 
                message: 'Batch not found' 
            });
        }

        res.json({
            success: true,
            ...batchDetails
        });

    } catch (error) {
        console.error('❌ Get batch details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch batch details',
            error: error.message 
        });
    }
});

/**
 * 8. GET ELIGIBLE LEARNERS FOR PROGRAM
 * Route: GET /api/allocations/eligible/:programType
 * Access: Admin + Departments
 */
router.get('/eligible/:programType', requirePermission('allocations'), async (req, res) => {
    try {
        const { programType } = req.params;
        const { class: className } = req.query;

        if (!['A', 'B'].includes(programType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Program type must be A or B' 
            });
        }

        console.log(`👥 Getting eligible learners for Program ${programType}`);

        const learners = await allocationService.getEligibleLearnersForProgram(programType, className);

        // Group by class for easier selection
        const learnersByClass = learners.reduce((acc, learner) => {
            const className = learner.class || 'Unassigned';
            if (!acc[className]) {
                acc[className] = [];
            }
            acc[className].push(learner);
            return acc;
        }, {});

        res.json({
            success: true,
            program_type: programType,
            total_learners: learners.length,
            learners: learners,
            grouped_by_class: learnersByClass,
            classes: Object.keys(learnersByClass).sort()
        });

    } catch (error) {
        console.error('❌ Get eligible learners error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch eligible learners',
            error: error.message 
        });
    }
});

/**
 * 9. GET PROGRAM STATISTICS
 * Route: GET /api/allocations/stats
 * Access: Admin only
 */
router.get('/stats', requirePermission('admin'), async (req, res) => {
    try {
        console.log(`📊 Getting allocation statistics`);

        // Get counts by class for each program
        const programAStats = await db.query(`
            SELECT 
                c.class,
                COUNT(DISTINCT c.customer_id) as total_learners,
                COUNT(ah.history_id) as total_allocations,
                SUM(ah.quantity) as total_items,
                SUM(ah.quantity * ah.unit_price) as total_value
            FROM customers c
            LEFT JOIN allocation_history ah ON c.customer_id = ah.customer_id 
                AND ah.program_type = 'A' 
                AND ah.is_allocation = TRUE
            WHERE c.program_membership LIKE '%A%'
            GROUP BY c.class
            ORDER BY c.class
        `);

        const programBStats = await db.query(`
            SELECT 
                c.class,
                COUNT(DISTINCT c.customer_id) as total_learners,
                COUNT(ah.history_id) as total_allocations,
                SUM(ah.quantity) as total_items,
                SUM(ah.quantity * ah.unit_price) as total_value
            FROM customers c
            LEFT JOIN allocation_history ah ON c.customer_id = ah.customer_id 
                AND ah.program_type = 'B' 
                AND ah.is_allocation = TRUE
            WHERE c.program_membership LIKE '%B%'
            GROUP BY c.class
            ORDER BY c.class
        `);

        // Get monthly trends
        const monthlyTrends = await db.query(`
            SELECT 
                DATE_TRUNC('month', given_date) as month,
                program_type,
                COUNT(*) as allocation_count,
                SUM(quantity) as item_count,
                SUM(quantity * unit_price) as total_value
            FROM allocation_history
            WHERE is_allocation = TRUE
            GROUP BY DATE_TRUNC('month', given_date), program_type
            ORDER BY month DESC, program_type
            LIMIT 12
        `);

        res.json({
            success: true,
            program_A: {
                stats: programAStats.rows,
                total_learners: programAStats.rows.reduce((sum, row) => sum + (parseInt(row.total_learners) || 0), 0),
                total_allocations: programAStats.rows.reduce((sum, row) => sum + (parseInt(row.total_allocations) || 0), 0)
            },
            program_B: {
                stats: programBStats.rows,
                total_learners: programBStats.rows.reduce((sum, row) => sum + (parseInt(row.total_learners) || 0), 0),
                total_allocations: programBStats.rows.reduce((sum, row) => sum + (parseInt(row.total_allocations) || 0), 0)
            },
            monthly_trends: monthlyTrends.rows,
            overall: {
                total_learners_in_programs: await db.query(`
                    SELECT 
                        COUNT(DISTINCT CASE WHEN program_membership LIKE '%A%' THEN customer_id END) as program_a_learners,
                        COUNT(DISTINCT CASE WHEN program_membership LIKE '%B%' THEN customer_id END) as program_b_learners,
                        COUNT(DISTINCT CASE WHEN program_membership LIKE '%A%' OR program_membership LIKE '%B%' THEN customer_id END) as total_program_learners
                    FROM customers
                `).then(result => result.rows[0])
            }
        });

    } catch (error) {
        console.error('❌ Get allocation statistics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch allocation statistics',
            error: error.message 
        });
    }
});

module.exports = router;