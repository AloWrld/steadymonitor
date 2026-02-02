// Global API Helper for SteadyMonitor
// Mirrors api.contract.json exactly
(function () {
  'use strict';

  const API_BASE = 'https://steadymonitor-backend.onrender.com';

  const API = {
    call: async function (endpoint, options = {}) {
      const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : endpoint;

      const config = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        mode: 'cors',
        ...options
      };

      try {
        const res = await fetch(url, config);

        if (!res.ok) {
          if (res.status === 401) {
            window.location.hash = '#index';
            return null;
          }
          const txt = await res.text();
          throw new Error(txt);
        }

        return await res.json();
      } catch (err) {
        console.error('[API ERROR]', err);
        throw err;
      }
    }
  };

  /* ================= AUTH ================= */
  API.auth = {
    login: (data) => API.call('/api/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => API.call('/api/logout', { method: 'POST' }),
    check: () => API.call('/api/check'),
    verify: () => API.call('/api/verify'),
    permissions: () => API.call('/api/permissions'),
    health: () => API.call('/api/health')
  };

  /* ================= ALLOCATION ================= */
  API.allocation = {
    createBatch: (data) => API.call('/api/batch', { method: 'POST', body: JSON.stringify(data) }),
    getCustomer: (customerId) => API.call(`/api/learner/${customerId}`),
    getProgram: (programType) => API.call(`/api/program/${programType}`),
    summary: () => API.call('/api/summary'),
    batches: () => API.call('/api/batches'),
    batch: (batchId) => API.call(`/api/batch/${batchId}`),
    eligible: (programType) => API.call(`/api/eligible/${programType}`),
    stats: () => API.call('/api/stats')
  };

  /* ================= CHECKOUT ================= */
  API.checkout = {
    complete: (data) => API.call('/api/complete', { method: 'POST', body: JSON.stringify(data) }),
    receipt: (saleId) => API.call(`/api/receipt/${saleId}`),
    lookupReceipt: (data) => API.call('/api/lookup-receipt', { method: 'POST', body: JSON.stringify(data) }),
    mpesaStk: (data) => API.call('/api/mpesa-stk', { method: 'POST', body: JSON.stringify(data) })
  };

  /* ================= CUSTOMER ================= */
  API.customer = {
    get: (identifier) => API.call(`/api/${identifier}`),
    update: (customerId, data) => API.call(`/api/${customerId}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (customerId) => API.call(`/api/${customerId}`, { method: 'DELETE' }),
    pay: (customerId, data) => API.call(`/api/${customerId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
    adjustBalance: (customerId, data) => API.call(`/api/${customerId}/adjust-balance`, { method: 'POST', body: JSON.stringify(data) }),
    allocations: (customerId) => API.call(`/api/${customerId}/allocations`),
    allocate: (customerId, data) => API.call(`/api/${customerId}/allocate`, { method: 'POST', body: JSON.stringify(data) }),
    fulfillAllocation: (customerId, data) => API.call(`/api/${customerId}/fulfill-allocation`, { method: 'POST', body: JSON.stringify(data) }),
    allocationHistory: (customerId) => API.call(`/api/${customerId}/allocation-history`),
    pocketMoneyStatus: (customerId) => API.call(`/api/${customerId}/pocket-money-status`),
    exerciseEligibility: (customerId) => API.call(`/api/${customerId}/exercise-book-eligibility`),
    recordInstallment: (customerId, data) => API.call(`/api/${customerId}/record-installment`, { method: 'POST', body: JSON.stringify(data) }),
    installments: (customerId) => API.call(`/api/${customerId}/installment-payments`),
    ledger: (customerId) => API.call(`/api/${customerId}/ledger`),
    transactions: (customerId) => API.call(`/api/${customerId}/transactions`),
    createBatch: (data) => API.call('/api/batch/create', { method: 'POST', body: JSON.stringify(data) }),
    classCustomers: (className) => API.call(`/api/class/${className}`),
    updateBatchPayment: (data) => API.call('/api/batch/update-payment', { method: 'POST', body: JSON.stringify(data) }),
    promote: (customerId, data) => API.call(`/api/${customerId}/promote`, { method: 'POST', body: JSON.stringify(data) }),
    promoteBatch: (data) => API.call('/api/batch/promote', { method: 'POST', body: JSON.stringify(data) }),
    changeClass: (customerId, data) => API.call(`/api/${customerId}/change-class`, { method: 'POST', body: JSON.stringify(data) }),
    promotionHistory: (customerId) => API.call(`/api/${customerId}/promotion-history`),
    disbursementHistory: (customerId) => API.call(`/api/${customerId}/disbursement-history`)
  };

  /* ================= DASHBOARD ================= */
  API.dashboard = {
    stats: () => API.call('/api/stats'),
    lowStock: () => API.call('/api/low-stock'),
    recentSales: () => API.call('/api/recent-sales'),
    customersBalance: () => API.call('/api/customers-balance')
  };

  /* ================= INVENTORY ================= */
  API.inventory = {
    products: () => API.call('/api/products'),
    product: (identifier) => API.call(`/api/products/${identifier}`),
    create: (data) => API.call('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (identifier, data) => API.call(`/api/products/${identifier}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (identifier) => API.call(`/api/products/${identifier}`, { method: 'DELETE' }),
    restock: (identifier, data) => API.call(`/api/products/${identifier}/restock`, { method: 'POST', body: JSON.stringify(data) }),
    adjustStock: (identifier, data) => API.call(`/api/products/${identifier}/adjust-stock`, { method: 'POST', body: JSON.stringify(data) }),
    lowStock: () => API.call('/api/low-stock'),
    search: () => API.call('/api/search'),
    dashboard: () => API.call('/api/dashboard'),
    activity: () => API.call('/api/activity')
  };

  /* ================= PAYMENT ================= */
  API.payment = {
    bulk: (data) => API.call('/api/bulk', { method: 'POST', body: JSON.stringify(data) }),
    byCustomer: (customerId) => API.call(`/api/learner/${customerId}`),
    summary: () => API.call('/api/summary'),
    outstanding: () => API.call('/api/outstanding'),
    validate: (data) => API.call('/api/validate', { method: 'POST', body: JSON.stringify(data) }),
    get: (paymentId) => API.call(`/api/${paymentId}`),
    installments: (customerId) => API.call(`/api/installments/${customerId}`),
    stats: () => API.call('/api/stats')
  };

  /* ================= POCKET MONEY ================= */
  API.pocketMoney = {
    purchase: (data) => API.call('/api/purchase', { method: 'POST', body: JSON.stringify(data) }),
    topup: (data) => API.call('/api/topup', { method: 'POST', body: JSON.stringify(data) }),
    deduct: (data) => API.call('/api/deduct', { method: 'POST', body: JSON.stringify(data) }),
    history: (customerId) => API.call(`/api/history/${customerId}`),
    summary: () => API.call('/api/summary'),
    stats: () => API.call('/api/stats'),
    enable: (customerId) => API.call(`/api/enable/${customerId}`, { method: 'POST' }),
    disable: (customerId) => API.call(`/api/disable/${customerId}`, { method: 'POST' }),
    validate: (data) => API.call('/api/validate', { method: 'POST', body: JSON.stringify(data) }),
    status: (customerId) => API.call(`/api/status/${customerId}`)
  };

  /* ================= POS ================= */
  API.pos = {
    productsByDepartment: (department) => API.call(`/api/products/${department}`),
    search: () => API.call('/api/search'),
    productBySku: (sku) => API.call(`/api/product/sku/${sku}`),
    mpesaPush: (data) => API.call('/api/mpesa-push', { method: 'POST', body: JSON.stringify(data) }),
    checkout: (data) => API.call('/api/checkout', { method: 'POST', body: JSON.stringify(data) }),
    lookup: (identifier) => API.call(`/api/lookup/${identifier}`),
    classCustomers: (className) => API.call(`/api/learners/class/${className}`),
    searchCustomers: () => API.call('/api/learners/search'),
    customer: (customerId) => API.call(`/api/learners/${customerId}`),
    classes: () => API.call('/api/classes'),
    departments: () => API.call('/api/departments'),
    debugCalls: () => API.call('/api/debug/calls')
  };

  /* ================= PRINT ================= */
  API.print = {
    receipt: (data) => API.call('/api/receipt', { method: 'POST', body: JSON.stringify(data) }),
    invoice: (data) => API.call('/api/invoice', { method: 'POST', body: JSON.stringify(data) }),
    getInvoice: (invoiceId) => API.call(`/api/invoice/${invoiceId}`),
    batch: (data) => API.call('/api/batch', { method: 'POST', body: JSON.stringify(data) }),
    settings: () => API.call('/api/settings'),
    invoices: () => API.call('/api/invoices')
  };

  /* ================= REFUND ================= */
  API.refund = {
    sale: (saleId) => API.call(`/api/sale/${saleId}`),
    receipt: (data) => API.call('/api/receipt', { method: 'POST', body: JSON.stringify(data) }),
    summary: () => API.call('/api/summary'),
    lookupReceipt: (data) => API.call('/api/lookup-receipt', { method: 'POST', body: JSON.stringify(data) })
  };

  /* ================= REPORT ================= */
  API.report = {
    sales: () => API.call('/api/sales'),
    profit: () => API.call('/api/profit'),
    inventory: () => API.call('/api/inventory'),
    customers: () => API.call('/api/customers'),
    allocations: () => API.call('/api/allocations'),
    pocketMoney: () => API.call('/api/pocket-money'),
    installments: () => API.call('/api/installments'),
    suppliers: () => API.call('/api/suppliers'),
    exportExcel: () => API.call('/api/export/excel'),
    exportPdf: () => API.call('/api/export/pdf'),
    dataStatus: () => API.call('/api/data-status'),
    overview: () => API.call('/api/overview')
  };

  /* ================= SUPPLIER ================= */
  API.supplier = {
    get: (id) => API.call(`/api/${id}`),
    update: (id, data) => API.call(`/api/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => API.call(`/api/${id}`, { method: 'DELETE' }),
    search: () => API.call('/api/search'),
    restock: (data) => API.call('/api/restock', { method: 'POST', body: JSON.stringify(data) }),
    restocks: () => API.call('/api/restocks/all'),
    payments: (data) => API.call('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    credits: (id) => API.call(`/api/${id}/credits`),
    transactions: (id) => API.call(`/api/${id}/transactions`),
    dueCredits: () => API.call('/api/reports/due-credits'),
    lowStock: () => API.call('/api/reports/low-stock'),
    performance: () => API.call('/api/reports/performance')
  };

  window.API = API;
  window.apiCall = API.call.bind(API);
})();
