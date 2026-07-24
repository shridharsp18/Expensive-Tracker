
        // DOM Elements
        const transactionForm = document.getElementById('transactionForm');
        const transactionList = document.getElementById('transactionList');
        const incomeTotal = document.getElementById('incomeTotal');
        const expenseTotal = document.getElementById('expenseTotal');
        const balanceTotal = document.getElementById('balanceTotal');
        const filterButtons = document.querySelectorAll('.filter-btn');

        // Chart instances
        let expenseChart = null;
        let summaryChart = null;

        // Currency formatter for Indian Rupee (INR) with Indian numbering system
        const inrFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Initialize transactions array from localStorage or empty array (robust parsing)
        let transactions = [];
        try {
            const stored = localStorage.getItem('transactions');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) transactions = parsed;
            }
        } catch (err) {
            console.warn('Failed to parse stored transactions. Resetting storage.');
            localStorage.removeItem('transactions');
        }

        // Generate unique ID for each transaction
        function generateID() {
            return Math.floor(Math.random() * 1000000);
        }

        // Add transaction
        function addTransaction(e) {
            e.preventDefault();
            
            const description = document.getElementById('description').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const type = document.getElementById('type').value;
            const category = document.getElementById('category').value;
            
            if (description.trim() === '' || isNaN(amount) || amount <= 0) {
                alert('Please enter a valid description and amount');
                return;
            }
            
            const transaction = {
                id: generateID(),
                description,
                amount: type === 'income' ? amount : -amount,
                type,
                category,
                date: new Date().toLocaleDateString('en-IN')
            };
            
            transactions.push(transaction);
            updateLocalStorage();
            updateUI();
            
            // Reset form
            transactionForm.reset();
        }

        // Delete transaction
        function deleteTransaction(id) {
            if (confirm('Are you sure you want to delete this transaction?')) {
                transactions = transactions.filter(transaction => transaction.id !== id);
                updateLocalStorage();
                updateUI();
            }
        }

        // Update totals
        function updateTotals() {
            const amounts = transactions.map(transaction => transaction.amount);
            
            const total = amounts.reduce((acc, item) => acc + item, 0);
            const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
            const expense = amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1;
            
            balanceTotal.textContent = inrFormatter.format(total);
            incomeTotal.textContent = `+ ${inrFormatter.format(income)}`;
            expenseTotal.textContent = `- ${inrFormatter.format(expense)}`;
        }

        // Update localStorage
        function updateLocalStorage() {
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }

        // Render transactions
        function renderTransactions(filter = 'all') {
            transactionList.innerHTML = '';
            
            if (transactions.length === 0) {
                transactionList.innerHTML = '<li class="transaction-item" style="justify-content: center; color: #7f8c8d;">No transactions yet</li>';
                return;
            }
            
            let filteredTransactions = transactions;
            
            if (filter !== 'all') {
                filteredTransactions = transactions.filter(transaction => transaction.type === filter);
            }

            if (filteredTransactions.length === 0) {
                transactionList.innerHTML = '<li class="transaction-item" style="justify-content: center; color: #7f8c8d;">No transactions for this filter</li>';
                return;
            }
            
            filteredTransactions.forEach(transaction => {
                const sign = transaction.amount > 0 ? '+' : '-';
                const amountClass = transaction.amount > 0 ? 'income' : 'expense';
                const formattedAbs = inrFormatter.format(Math.abs(transaction.amount));
                
                const li = document.createElement('li');
                li.className = 'transaction-item';
                li.innerHTML = `
                    <div class="transaction-details">
                        <div class="transaction-title">${transaction.description}</div>
                        <div class="transaction-category">${transaction.category} • ${transaction.date}</div>
                    </div>
                    <div class="transaction-amount ${amountClass}">${sign} ${formattedAbs}</div>
                    <div class="transaction-actions">
                        <button class="btn btn-delete" onclick="deleteTransaction(${transaction.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                transactionList.appendChild(li);
            });
        }

        // Filter transactions
        function filterTransactions(e) {
            const filter = e.target.dataset.filter;
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            renderTransactions(filter);
        }

        // Update charts (Expense Breakdown + Summary)
        function updateCharts() {
            const noDataMessage = document.getElementById('noDataMessage');

            // ---------- Expense Breakdown (Doughnut) ----------
            const expenseTransactions = transactions.filter(t => t.amount < 0);
            const expenseCanvas = document.getElementById('expenseChart');
            if (expenseCanvas) {
                const ctx = expenseCanvas.getContext('2d');

                if (expenseTransactions.length === 0) {
                    if (expenseChart) {
                        expenseChart.destroy();
                        expenseChart = null;
                    }
                    if (noDataMessage) noDataMessage.style.display = 'block';
                } else {
                    if (noDataMessage) noDataMessage.style.display = 'none';

                    const categoryTotals = {};
                    expenseTransactions.forEach(t => {
                        const cat = t.category || 'Other';
                        const absAmt = Math.abs(t.amount);
                        categoryTotals[cat] = (categoryTotals[cat] || 0) + absAmt;
                    });

                    const labels = Object.keys(categoryTotals);
                    const data = Object.values(categoryTotals);

                    if (expenseChart) {
                        expenseChart.destroy();
                    }

                    expenseChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels,
                            datasets: [{
                                data,
                                backgroundColor: [
                                    '#e74c3c',
                                    '#f1c40f',
                                    '#3498db',
                                    '#9b59b6',
                                    '#1abc9c',
                                    '#e67e22',
                                    '#2ecc71',
                                    '#95a5a6',
                                    '#34495e'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            plugins: {
                                legend: {
                                    position: 'bottom'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            const value = context.parsed;
                                            const dataset = context.chart.data.datasets[context.datasetIndex];
                                            const total = dataset.data.reduce((sum, val) => sum + val, 0);
                                            const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                                            return `${context.label}: ${inrFormatter.format(value)} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }

            // ---------- Summary Chart (Income, Expense, Balance) ----------
            const summaryCanvas = document.getElementById('summaryChart');
            if (summaryCanvas) {
                const ctx2 = summaryCanvas.getContext('2d');

                const amounts = transactions.map(t => t.amount);
                const total = amounts.reduce((acc, item) => acc + item, 0);
                const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
                const expense = amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1;

                if (summaryChart) {
                    summaryChart.destroy();
                }

                summaryChart = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: ['Income', 'Expense', 'Balance'],
                        datasets: [{
                            data: [income, expense, total],
                            backgroundColor: ['#2ecc71', '#e74c3c', '#3498db'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const value = context.parsed.y || 0;
                                        return inrFormatter.format(value);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }

        // Update UI
        function updateUI() {
            updateTotals();
            
            // Render only for the active filter
            let activeFilter = 'all';
            filterButtons.forEach(btn => {
                if (btn.classList.contains('active')) {
                    activeFilter = btn.dataset.filter;
                }
            });
            renderTransactions(activeFilter);

            // Update charts
            updateCharts();
        }

        // Event listeners
        transactionForm.addEventListener('submit', addTransaction);
        filterButtons.forEach(btn => btn.addEventListener('click', filterTransactions));

        // Initial UI update
        updateUI();
