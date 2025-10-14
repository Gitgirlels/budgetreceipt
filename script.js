  // Show loading animation on page load
        function showLoadingAnimation() {
            const overlay = document.getElementById('loading-overlay');
            const loadingBar = document.getElementById('loading-bar');
            const loadingText = document.getElementById('loading-text');
            const checkmark = document.getElementById('checkmark');
            const completeText = document.getElementById('complete-text');
            const timestamp = document.getElementById('timestamp');
            
            // Set timestamp
            const now = new Date();
            timestamp.textContent = now.toLocaleString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            
            let progress = 0;
            const statuses = [
                { step: 1, text: 'INITIALIZING...', progress: 20 },
                { step: 2, text: 'LOADING DATA...', progress: 50 },
                { step: 3, text: 'PREPARING INTERFACE...', progress: 75 },
                { step: 4, text: 'FINALIZING...', progress: 100 }
            ];
            
            let currentStatus = 0;
            
            const interval = setInterval(() => {
                if (currentStatus < statuses.length) {
                    const status = statuses[currentStatus];
                    progress = status.progress;
                    loadingBar.style.width = progress + '%';
                    loadingBar.textContent = progress + '%';
                    loadingText.textContent = status.text;
                    
                    // Update status checkmarks
                    if (currentStatus >= 0) document.getElementById('status-1').textContent = '✓';
                    if (currentStatus >= 1) document.getElementById('status-2').textContent = '✓';
                    if (currentStatus >= 2) document.getElementById('status-3').textContent = '✓';
                    
                    currentStatus++;
                } else {
                    clearInterval(interval);
                    
                    // Show completion
                    setTimeout(() => {
                        loadingText.style.display = 'none';
                        checkmark.style.display = 'block';
                        completeText.style.display = 'block';
                        
                        // Hide overlay after showing completion
                        setTimeout(() => {
                            overlay.style.display = 'none';
                        }, 1000);
                    }, 500);
                }
            }, 600);
        }

        // Run loading animation on page load
        window.addEventListener('load', showLoadingAnimation);

        // Authentication State
        let currentUser = null;
        let autoSaveTimeout = null;
        let budgetMode = 'partner'; // 'alone' or 'partner'

        function setBudgetMode(mode) {
            budgetMode = mode;
            
            // Update button states
            document.getElementById('mode-alone').classList.remove('active');
            document.getElementById('mode-partner').classList.remove('active');
            document.getElementById('mode-' + mode).classList.add('active');
            
            // Toggle visibility of name inputs
            if (mode === 'alone') {
                document.getElementById('partner-names').style.display = 'none';
                document.getElementById('alone-name').style.display = 'flex';
                document.getElementById('income-row-2').style.display = 'none';
                document.getElementById('spendable-row-2').style.display = 'none';
                document.getElementById('split-selector-section').style.display = 'none';
                
                // Hide partner columns in all sections
                hidePartnerColumns(true);
                
                // Update labels
                const name = document.getElementById('name-single').value || 'You';
                document.getElementById('header-names').textContent = name;
                document.getElementById('income-label-1').textContent = 'YOUR INCOME:';
                document.getElementById('total-income-label').textContent = 'TOTAL INCOME:';
                document.getElementById('spendable-label-1').textContent = 'YOUR SPENDABLE:';
                
            } else {
                document.getElementById('partner-names').style.display = 'flex';
                document.getElementById('alone-name').style.display = 'none';
                document.getElementById('income-row-2').style.display = 'flex';
                document.getElementById('spendable-row-2').style.display = 'flex';
                document.getElementById('split-selector-section').style.display = 'block';
                
                // Show partner columns
                hidePartnerColumns(false);
            }
            
            updateNames();
            autoSave();
        }

        function hidePartnerColumns(hide) {
            const headers = ['header-shared', 'header-subscriptions', 'header-debt', 'header-savings', 'header-other'];
            headers.forEach(headerId => {
                const header = document.getElementById(headerId);
                const columns = header.querySelectorAll('span');
                if (hide) {
                    columns[2].style.display = 'none'; // Hide partner column
                } else {
                    columns[2].style.display = 'block';
                }
            });
            
            // Re-render all sections to update column visibility
            renderSection('shared-expenses-body', sharedExpensesData, 'shared');
            renderSection('subscriptions-body', subscriptionsData, 'subscription');
            renderSection('debt-body', debtData, 'debt');
            renderSection('savings-body', savingsData, 'savings');
            renderSection('other-spending-body', otherSpendingData, 'other');
        }

        // Check if user is logged in on page load
        function checkAuth() {
            const savedUser = localStorage.getItem('budgetReceiptUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                showLoggedInView();
                loadUserData();
            }
        }

        function switchAuthTab(tab) {
            const loginTab = document.querySelectorAll('.auth-tab')[0];
            const signupTab = document.querySelectorAll('.auth-tab')[1];
            const loginForm = document.getElementById('login-form');
            const signupForm = document.getElementById('signup-form');

            if (tab === 'login') {
                loginTab.classList.add('active');
                signupTab.classList.remove('active');
                loginForm.style.display = 'flex';
                signupForm.style.display = 'none';
            } else {
                loginTab.classList.remove('active');
                signupTab.classList.add('active');
                loginForm.style.display = 'none';
                signupForm.style.display = 'flex';
            }
        }

        function handleLogin() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                alert('Please enter both email and password');
                return;
            }

            // Check if user exists in localStorage
            const users = JSON.parse(localStorage.getItem('budgetReceiptUsers') || '{}');
            
            if (users[email] && users[email].password === password) {
                currentUser = { email };
                localStorage.setItem('budgetReceiptUser', JSON.stringify(currentUser));
                showLoggedInView();
                loadUserData();
                alert('Login successful!');
            } else {
                alert('Invalid email or password');
            }
        }

        function handleSignup() {
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;

            if (!email || !password || !confirm) {
                alert('Please fill in all fields');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            if (password !== confirm) {
                alert('Passwords do not match');
                return;
            }

            // Check if user already exists
            const users = JSON.parse(localStorage.getItem('budgetReceiptUsers') || '{}');
            
            if (users[email]) {
                alert('An account with this email already exists');
                return;
            }

            // Create new user
            users[email] = { password };
            localStorage.setItem('budgetReceiptUsers', JSON.stringify(users));
            
            // Log them in
            currentUser = { email };
            localStorage.setItem('budgetReceiptUser', JSON.stringify(currentUser));
            showLoggedInView();
            alert('Account created successfully!');
        }

        function handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('budgetReceiptUser');
                currentUser = null;
                showLoggedOutView();
            }
        }

        function handleSocialLogin(provider) {
            // Show loading overlay
            const loadingOverlay = document.getElementById('loading-overlay');
            const loadingReceipt = loadingOverlay.querySelector('.loading-receipt');
            
            loadingOverlay.style.display = 'flex';
            loadingReceipt.querySelector('h2').textContent = provider.toUpperCase() + ' LOGIN';
            loadingReceipt.querySelector('.store-info').innerHTML = `
                Connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...
                <br>
                Please wait
                <br>
                ================================
            `;
            
            // Hide status items during social login
            document.getElementById('status-1').parentElement.style.display = 'none';
            document.getElementById('status-2').parentElement.style.display = 'none';
            document.getElementById('status-3').parentElement.style.display = 'none';
            
            const loadingBar = document.getElementById('loading-bar');
            const loadingText = document.getElementById('loading-text');
            const checkmark = document.getElementById('checkmark');
            const completeText = document.getElementById('complete-text');
            
            // Reset elements
            loadingBar.style.width = '0%';
            loadingBar.textContent = '0%';
            checkmark.style.display = 'none';
            completeText.style.display = 'none';
            loadingText.style.display = 'block';
            loadingText.textContent = 'Authenticating...';
            
            // Simulate OAuth flow
            let progress = 0;
            const interval = setInterval(() => {
                progress += 25;
                loadingBar.style.width = progress + '%';
                loadingBar.textContent = progress + '%';
                
                if (progress === 25) loadingText.textContent = 'Redirecting...';
                if (progress === 50) loadingText.textContent = 'Verifying credentials...';
                if (progress === 75) loadingText.textContent = 'Finalizing...';
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Simulate successful login
                    setTimeout(() => {
                        // Create demo account
                        const demoEmail = `user@${provider}.com`;
                        currentUser = { email: demoEmail, provider: provider };
                        localStorage.setItem('budgetReceiptUser', JSON.stringify(currentUser));
                        
                        loadingText.style.display = 'none';
                        checkmark.style.display = 'block';
                        completeText.innerHTML = `
                            LOGIN SUCCESSFUL
                            <br>
                            <span style="font-size: 11px; color: #666;">Welcome back!</span>
                        `;
                        completeText.style.display = 'block';
                        
                        setTimeout(() => {
                            loadingOverlay.style.display = 'none';
                            showLoggedInView();
                            loadUserData();
                            
                            // Reset receipt for next time
                            loadingReceipt.querySelector('h2').textContent = 'BUDGET RECEIPT';
                            loadingReceipt.querySelector('.store-info').innerHTML = `
                                Your Personal Finance Manager
                                <br>
                                budgetreceipt.com
                                <br>
                                ================================
                            `;
                            document.getElementById('status-1').parentElement.style.display = 'flex';
                            document.getElementById('status-2').parentElement.style.display = 'flex';
                            document.getElementById('status-3').parentElement.style.display = 'flex';
                        }, 1500);
                    }, 500);
                }
            }, 400);
        }

        function showLoggedInView() {
            document.getElementById('logged-out-view').style.display = 'none';
            document.getElementById('logged-in-view').style.display = 'block';
            
            let displayEmail = currentUser.email;
            if (currentUser.provider) {
                const providerIcons = {
                    google: '🔵',
                    apple: '🍎',
                    microsoft: '🪟',
                    facebook: '📘'
                };
                displayEmail = `${providerIcons[currentUser.provider] || ''} ${currentUser.email}`;
            }
            
            document.getElementById('user-email').innerHTML = displayEmail;
        }

        function showLoggedOutView() {
            document.getElementById('logged-out-view').style.display = 'block';
            document.getElementById('logged-in-view').style.display = 'none';
            // Clear forms
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm').value = '';
        }

        function saveUserData() {
            if (!currentUser) return;

            const userData = {
                budgetMode,
                nameSingle: document.getElementById('name-single').value,
                name1: document.getElementById('name1').value,
                name2: document.getElementById('name2').value,
                payFrequency: document.getElementById('pay-frequency').value,
                payday: document.getElementById('payday').value,
                income1: document.getElementById('income1').value,
                income2: document.getElementById('income2').value,
                splitType: document.getElementById('split-type').value,
                sharedExpensesData,
                subscriptionsData,
                debtData,
                savingsData,
                otherSpendingData
            };

            const userDataKey = `budgetData_${currentUser.email}`;
            localStorage.setItem(userDataKey, JSON.stringify(userData));
            
            // Show save indicator
            const indicator = document.getElementById('save-indicator');
            indicator.textContent = '✓ Data saved';
            indicator.style.color = '#00aa00';
        }

        function loadUserData() {
            if (!currentUser) return;

            const userDataKey = `budgetData_${currentUser.email}`;
            const savedData = localStorage.getItem(userDataKey);

            if (savedData) {
                const userData = JSON.parse(savedData);
                
                if (userData.budgetMode) {
                    budgetMode = userData.budgetMode;
                    setBudgetMode(budgetMode);
                }
                
                document.getElementById('name-single').value = userData.nameSingle || 'John';
                document.getElementById('name1').value = userData.name1 || 'John';
                document.getElementById('name2').value = userData.name2 || 'Jane';
                document.getElementById('pay-frequency').value = userData.payFrequency || 'fortnightly';
                document.getElementById('payday').value = userData.payday || '';
                document.getElementById('income1').value = userData.income1 || '2300';
                document.getElementById('income2').value = userData.income2 || '1600';
                document.getElementById('split-type').value = userData.splitType || '50/50';

                if (userData.sharedExpensesData) sharedExpensesData = userData.sharedExpensesData;
                if (userData.subscriptionsData) subscriptionsData = userData.subscriptionsData;
                if (userData.debtData) debtData = userData.debtData;
                if (userData.savingsData) savingsData = userData.savingsData;
                if (userData.otherSpendingData) otherSpendingData = userData.otherSpendingData;

                updateNames();
                renderSection('shared-expenses-body', sharedExpensesData, 'shared');
                renderSection('subscriptions-body', subscriptionsData, 'subscription');
                renderSection('debt-body', debtData, 'debt');
                renderSection('savings-body', savingsData, 'savings');
                renderSection('other-spending-body', otherSpendingData, 'other');
                calculateSpendable();
            }
        }

        function autoSave() {
            if (!currentUser) return;
            
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveUserData();
            }, 1000);
        }

        let sharedExpensesData = [
            {name: 'Rent', together: 1300, person1: 650, person2: 650},
            {name: 'Groceries', together: 440, person1: 220, person2: 220},
            {name: 'Emergency', together: 50, person1: 25, person2: 25},
            {name: 'Out & About', together: 100, person1: 50, person2: 50},
            {name: 'Takeaway', together: 160, person1: 80, person2: 80},
            {name: 'Leisure', together: 200, person1: 100, person2: 100},
            {name: 'Utilities', together: 170, person1: 85, person2: 85},
            {name: 'Cat', together: 45, person1: 22.5, person2: 22.5},
            {name: 'Fuel', together: 0, person1: 30, person2: 15},
            {name: 'Transport', together: 240, person1: 120, person2: 120}
        ];

        let subscriptionsData = [
            {name: 'Riding', together: 80, person1: 40, person2: 40},
            {name: 'Phone/Internet', together: 0, person1: 31, person2: 50},
            {name: 'Claude', together: 0, person1: 17, person2: 0},
            {name: 'ChatGPT', together: 0, person1: 0, person2: 15},
            {name: 'Canva', together: 0, person1: 10, person2: 0},
            {name: 'Prime Video', together: 0, person1: 0, person2: 4.5},
            {name: 'UFC Fight Pass', together: 0, person1: 0, person2: 5.5},
            {name: 'Fitness', together: 63.8, person1: 31.9, person2: 31.9},
            {name: 'YouTube', together: 12.99, person1: 6.495, person2: 6.495},
            {name: 'iCloud', together: 0, person1: 0, person2: 2.26},
            {name: 'Car Insurance', together: 0, person1: 76, person2: 0},
            {name: 'Railway', together: 0, person1: 3.47, person2: 0},
            {name: 'Nurse Assoc.', together: 0, person1: 33, person2: 0}
        ];

        let debtData = [
            {name: 'HECS', together: 0, person1: 0, person2: 0},
            {name: 'Afterpay', together: 0, person1: 349, person2: 237}
        ];

        let savingsData = [
            {name: 'Cat', person1: 50, person2: 50},
            {name: 'Melbourne Xmas', person1: 50, person2: 50},
            {name: 'House', person1: 1000, person2: 0},
            {name: 'Super', person1: 0, person2: 0}
        ];

        let otherSpendingData = [
            {name: 'New Item', person1: 0, person2: 0}
        ];

        const splitRatios = {
            '50/50': {person1: 0.5, person2: 0.5},
            '75/25': {person1: 0.75, person2: 0.25},
            '25/75': {person1: 0.25, person2: 0.75},
            '40/60': {person1: 0.4, person2: 0.6},
            '55/45': {person1: 0.55, person2: 0.45}
        };

        // Set default payday to next Monday
        function setDefaultPayday() {
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
            document.getElementById('payday').valueAsDate = nextMonday;
        }

        function formatMoney(amount) {
            return '$' + amount.toFixed(2);
        }

        function formatDate(date) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        function updateNames() {
            if (budgetMode === 'alone') {
                const name = document.getElementById('name-single').value || 'You';
                document.getElementById('header-names').textContent = name;
                document.getElementById('income-label-1').textContent = 'YOUR INCOME:';
                document.getElementById('spendable-label-1').textContent = 'YOUR SPENDABLE:';
                
                // Update all column headers to show only single name
                for (let i = 1; i <= 5; i++) {
                    document.getElementById(`col-name-1-${i}`).textContent = name.toUpperCase();
                }
            } else {
                const name1 = document.getElementById('name1').value || 'Person 1';
                const name2 = document.getElementById('name2').value || 'Person 2';
                
                document.getElementById('header-names').textContent = `${name1} & ${name2}`;
                document.getElementById('income-label-1').textContent = `${name1.toUpperCase()} INCOME:`;
                document.getElementById('income-label-2').textContent = `${name2.toUpperCase()} INCOME:`;
                
                for (let i = 1; i <= 5; i++) {
                    document.getElementById(`col-name-1-${i}`).textContent = name1.toUpperCase();
                    document.getElementById(`col-name-2-${i}`).textContent = name2.toUpperCase();
                }
                
                document.getElementById('spendable-label-1').textContent = `${name1.toUpperCase()} SPENDABLE:`;
                document.getElementById('spendable-label-2').textContent = `${name2.toUpperCase()} SPENDABLE:`;
            }
            
            autoSave();
        }

        function deleteItem(type, index) {
            if (!confirm('Are you sure you want to delete this item?')) return;
            
            if (type === 'shared') {
                sharedExpensesData.splice(index, 1);
                renderSection('shared-expenses-body', sharedExpensesData, 'shared');
            } else if (type === 'subscription') {
                subscriptionsData.splice(index, 1);
                renderSection('subscriptions-body', subscriptionsData, 'subscription');
            } else if (type === 'debt') {
                debtData.splice(index, 1);
                renderSection('debt-body', debtData, 'debt');
            } else if (type === 'savings') {
                savingsData.splice(index, 1);
                renderSection('savings-body', savingsData, 'savings');
            } else if (type === 'other') {
                otherSpendingData.splice(index, 1);
                renderSection('other-spending-body', otherSpendingData, 'other');
            }
            
            calculateSpendable();
            autoSave();
        }

        function addItem(type) {
            const newItem = {
                name: 'New Item',
                together: 0,
                person1: 0,
                person2: 0
            };
            
            if (type === 'shared') {
                sharedExpensesData.push(newItem);
                renderSection('shared-expenses-body', sharedExpensesData, 'shared');
            } else if (type === 'subscription') {
                subscriptionsData.push(newItem);
                renderSection('subscriptions-body', subscriptionsData, 'subscription');
            } else if (type === 'debt') {
                debtData.push(newItem);
                renderSection('debt-body', debtData, 'debt');
            } else if (type === 'savings') {
                delete newItem.together;
                savingsData.push(newItem);
                renderSection('savings-body', savingsData, 'savings');
            } else if (type === 'other') {
                delete newItem.together;
                otherSpendingData.push(newItem);
                renderSection('other-spending-body', otherSpendingData, 'other');
            }
            
            calculateSpendable();
            autoSave();
        }

        function updateItemValue(type, index, field, value) {
            const numValue = parseFloat(value) || 0;
            
            if (type === 'shared') {
                sharedExpensesData[index][field] = numValue;
                if (field === 'together') {
                    const splitType = document.getElementById('split-type').value;
                    const ratio = splitRatios[splitType];
                    sharedExpensesData[index].person1 = numValue * ratio.person1;
                    sharedExpensesData[index].person2 = numValue * ratio.person2;
                    renderSection('shared-expenses-body', sharedExpensesData, 'shared');
                }
            } else if (type === 'subscription') {
                subscriptionsData[index][field] = numValue;
            } else if (type === 'debt') {
                debtData[index][field] = numValue;
            } else if (type === 'savings') {
                savingsData[index][field] = numValue;
            } else if (type === 'other') {
                otherSpendingData[index][field] = numValue;
            }
            
            calculateSpendable();
            autoSave();
        }

        function updateItemName(type, index, value) {
            if (type === 'shared') {
                sharedExpensesData[index].name = value;
            } else if (type === 'subscription') {
                subscriptionsData[index].name = value;
            } else if (type === 'debt') {
                debtData[index].name = value;
            } else if (type === 'savings') {
                savingsData[index].name = value;
            } else if (type === 'other') {
                otherSpendingData[index].name = value;
            }
            autoSave();
        }

        function renderSection(bodyId, data, type) {
            const tbody = document.getElementById(bodyId);
            tbody.innerHTML = '';
            
            let totalPerson1 = 0;
            let totalPerson2 = 0;

            data.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'receipt-item';
                
                if (budgetMode === 'alone') {
                    row.innerHTML = `
                        <input type="text" class="item-name" value="${item.name}" 
                               onchange="updateItemName('${type}', ${index}, this.value)">
                        <input type="number" step="0.01" value="${item.person1}" 
                               onchange="updateItemValue('${type}', ${index}, 'person1', this.value)">
                        <button class="delete-btn" onclick="deleteItem('${type}', ${index})">DEL</button>
                    `;
                } else {
                    row.innerHTML = `
                        <input type="text" class="item-name" value="${item.name}" 
                               onchange="updateItemName('${type}', ${index}, this.value)">
                        <input type="number" step="0.01" value="${item.person1}" 
                               onchange="updateItemValue('${type}', ${index}, 'person1', this.value)">
                        <input type="number" step="0.01" value="${item.person2}" 
                               onchange="updateItemValue('${type}', ${index}, 'person2', this.value)">
                        <button class="delete-btn" onclick="deleteItem('${type}', ${index})">DEL</button>
                    `;
                }
                
                tbody.appendChild(row);
                totalPerson1 += item.person1;
                totalPerson2 += item.person2;
            });

            const totalRow = document.createElement('div');
            totalRow.className = 'receipt-item total-row';
            
            if (budgetMode === 'alone') {
                totalRow.innerHTML = `
                    <span>TOTAL:</span>
                    <span style="text-align: right; width: 70px;">${formatMoney(totalPerson1)}</span>
                    <span style="width: 48px;"></span>
                `;
            } else {
                totalRow.innerHTML = `
                    <span>TOTAL:</span>
                    <span style="text-align: right; width: 70px;">${formatMoney(totalPerson1)}</span>
                    <span style="text-align: right; width: 70px;">${formatMoney(totalPerson2)}</span>
                    <span style="width: 48px;"></span>
                `;
            }
            
            tbody.appendChild(totalRow);
        }

        function updateSplit() {
            const splitType = document.getElementById('split-type').value;
            const ratio = splitRatios[splitType];

            sharedExpensesData.forEach(expense => {
                if (expense.together > 0) {
                    expense.person1 = expense.together * ratio.person1;
                    expense.person2 = expense.together * ratio.person2;
                }
            });

            renderSection('shared-expenses-body', sharedExpensesData, 'shared');
            calculateSpendable();
            autoSave();
        }

        function calculateSpendable() {
            const person1Income = parseFloat(document.getElementById('income1').value) || 0;
            const person2Income = parseFloat(document.getElementById('income2').value) || 0;

            document.getElementById('total-income').textContent = formatMoney(person1Income + person2Income);

            let person1Total = 0;
            let person2Total = 0;

            // Only include Shared Expenses, Subscriptions, and Other Spending in spendable calculation
            sharedExpensesData.forEach(e => {
                person1Total += (e.person1 || 0);
                person2Total += (e.person2 || 0);
            });

            subscriptionsData.forEach(e => {
                person1Total += (e.person1 || 0);
                person2Total += (e.person2 || 0);
            });

            otherSpendingData.forEach(e => {
                person1Total += (e.person1 || 0);
                person2Total += (e.person2 || 0);
            });

            // Debt and Savings are NOT included in spendable calculation

            // Spendable = Income - (Shared Expenses + Subscriptions + Other Spending)
            const person1Spendable = person1Income - person1Total;
            const person2Spendable = person2Income - person2Total;

            document.getElementById('person1-spendable').textContent = formatMoney(person1Spendable);
            document.getElementById('person2-spendable').textContent = formatMoney(person2Spendable);

            return {
                person1Spendable,
                person2Spendable,
                person1Income,
                person2Income,
                person1Total,
                person2Total
            };
        }

        function showAnnualOverview() {
            const name1 = document.getElementById('name1').value || 'Person 1';
            const name2 = document.getElementById('name2').value || 'Person 2';
            const frequency = document.getElementById('pay-frequency').value;
            const paydayInput = document.getElementById('payday').value;
            
            if (!paydayInput) {
                alert('Please set a payday date first!');
                return;
            }

            const startDate = new Date(paydayInput);
            const periodsPerYear = frequency === 'weekly' ? 52 : frequency === 'fortnightly' ? 26 : 12;
            const daysBetween = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : 30;
            
            const subtitle = `${frequency.toUpperCase()} - ${periodsPerYear} PAY PERIODS PER YEAR`;
            document.getElementById('overview-subtitle').textContent = subtitle;

            let content = '';
            let person1Carryover = 0;
            let person2Carryover = 0;
            let person1TotalSaved = 0;
            let person2TotalSaved = 0;

            const budgetData = calculateSpendable();

            for (let i = 0; i < periodsPerYear; i++) {
                const periodDate = new Date(startDate);
                periodDate.setDate(startDate.getDate() + (i * daysBetween));
                
                const person1Available = budgetData.person1Income + person1Carryover;
                const person2Available = budgetData.person2Income + person2Carryover;
                
                const person1AfterExpenses = person1Available - budgetData.person1Total;
                const person2AfterExpenses = person2Available - budgetData.person2Total;
                
                person1Carryover = Math.max(0, person1AfterExpenses);
                person2Carryover = Math.max(0, person2AfterExpenses);
                
                person1TotalSaved += person1Carryover;
                person2TotalSaved += person2Carryover;

                content += `
                    <div class="period-card">
                        <h3>PERIOD ${i + 1} - ${formatDate(periodDate)}</h3>
                        <div class="period-detail">
                            <span>${name1} Income:</span>
                            <span>${formatMoney(budgetData.person1Income)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name1} Carryover:</span>
                            <span>${formatMoney(person1Available - budgetData.person1Income)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name1} Available:</span>
                            <span>${formatMoney(person1Available)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name1} Expenses:</span>
                            <span>${formatMoney(budgetData.person1Total)}</span>
                        </div>
                        <div class="period-detail highlight">
                            <span>${name1} Saved:</span>
                            <span>${formatMoney(person1Carryover)}</span>
                        </div>
                        <br>
                        <div class="period-detail">
                            <span>${name2} Income:</span>
                            <span>${formatMoney(budgetData.person2Income)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name2} Carryover:</span>
                            <span>${formatMoney(person2Available - budgetData.person2Income)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name2} Available:</span>
                            <span>${formatMoney(person2Available)}</span>
                        </div>
                        <div class="period-detail">
                            <span>${name2} Expenses:</span>
                            <span>${formatMoney(budgetData.person2Total)}</span>
                        </div>
                        <div class="period-detail highlight">
                            <span>${name2} Saved:</span>
                            <span>${formatMoney(person2Carryover)}</span>
                        </div>
                    </div>
                `;
            }

            // Add annual summary
            content += `
                <div class="period-card" style="background-color: #e6f3ff; border: 2px solid #0066cc;">
                    <h3>ANNUAL SUMMARY</h3>
                    <div class="period-detail">
                        <span>${name1} Total Income:</span>
                        <span>${formatMoney(budgetData.person1Income * periodsPerYear)}</span>
                    </div>
                    <div class="period-detail">
                        <span>${name1} Total Expenses:</span>
                        <span>${formatMoney(budgetData.person1Total * periodsPerYear)}</span>
                    </div>
                    <div class="period-detail highlight">
                        <span>${name1} Total Saved:</span>
                        <span>${formatMoney(person1TotalSaved)}</span>
                    </div>
                    <br>
                    <div class="period-detail">
                        <span>${name2} Total Income:</span>
                        <span>${formatMoney(budgetData.person2Income * periodsPerYear)}</span>
                    </div>
                    <div class="period-detail">
                        <span>${name2} Total Expenses:</span>
                        <span>${formatMoney(budgetData.person2Total * periodsPerYear)}</span>
                    </div>
                    <div class="period-detail highlight">
                        <span>${name2} Total Saved:</span>
                        <span>${formatMoney(person2TotalSaved)}</span>
                    </div>
                    <br>
                    <div class="period-detail highlight" style="font-size: 14px; background-color: #fff; padding: 8px;">
                        <span>COMBINED TOTAL SAVED:</span>
                        <span>${formatMoney(person1TotalSaved + person2TotalSaved)}</span>
                    </div>
                </div>
            `;

            document.getElementById('overview-content').innerHTML = content;
            document.getElementById('annualModal').style.display = 'block';
        }

        function downloadReceipt() {
            window.print();
        }

        function downloadAnnualReceipt() {
            // Store original content
            const originalBody = document.body.innerHTML;
            const modalContent = document.getElementById('overview-content').innerHTML;
            const subtitle = document.getElementById('overview-subtitle').textContent;
            
            // Create print-friendly version
            document.body.innerHTML = `
                <div style="font-family: 'Courier New', monospace; padding: 20mm;">
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="font-size: 22px; margin: 0 0 10px 0;">ANNUAL RECEIPT</h1>
                        <div>${subtitle}</div>
                    </div>
                    ${modalContent}
                </div>
            `;
            
            // Print
            window.print();
            
            // Restore original content
            document.body.innerHTML = originalBody;
            
            // Reinitialize event listeners
            location.reload();
        }

        function closeModal() {
            document.getElementById('annualModal').style.display = 'none';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('annualModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        // Initialize
        checkAuth();
        setDefaultPayday();
        renderSection('shared-expenses-body', sharedExpensesData, 'shared');
        renderSection('subscriptions-body', subscriptionsData, 'subscription');
        renderSection('debt-body', debtData, 'debt');
        renderSection('savings-body', savingsData, 'savings');
        renderSection('other-spending-body', otherSpendingData, 'other');
        calculateSpendable();
        updateNames();

        // Add input listeners for auto-save
        document.getElementById('name-single').addEventListener('input', autoSave);
        document.getElementById('name1').addEventListener('input', autoSave);
        document.getElementById('name2').addEventListener('input', autoSave);
        document.getElementById('pay-frequency').addEventListener('change', autoSave);
        document.getElementById('payday').addEventListener('change', autoSave);
        document.getElementById('income1').addEventListener('change', () => {
            calculateSpendable();
            autoSave();
        });
        document.getElementById('income2').addEventListener('change', () => {
            calculateSpendable();
            autoSave();
        });
        document.getElementById('split-type').addEventListener('change', autoSave);
