import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBTn3IkFFX7JEVOTbMfomoYzL_ymBy2dH8",
    authDomain: "halal-broilers-billing.firebaseapp.com",
    projectId: "halal-broilers-billing",
    storageBucket: "halal-broilers-billing.firebasestorage.app",
    messagingSenderId: "1011264761780",
    appId: "1:1011264761780:web:5e73201301d6ad8b054ce1",
    measurementId: "G-871L1DVP7C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const PRODUCTS = [
    { id: 1, name: "Broiler Chicken", type: "formula1" },
    { id: 2, name: "Biriyani Piece", type: "formula1" },
    { id: 3, name: "Chilli", type: "formula1" },
    { id: 4, name: "Grill", type: "formula1" },
    { id: 5, name: "Boneless", type: "formula1" },
    { id: 6, name: "Liver", type: "formula2" },
    { id: 7, name: "Mutton", type: "formula2" },
    { id: 8, name: "Naatukoli", type: "formula2" },
    { id: 9, name: "Waste", type: "formula2" }
];

let activeHotel = null;
let allStaffData = [];
let allHotelsData = [];
let allSalesData = [];

window.addEventListener('DOMContentLoaded', () => {
    let splash = document.getElementById('splashScreen');
    let loginModal = document.getElementById('loginModal');
    let dashboardContent = document.getElementById('dashboardContent');
    // Password View / Hide Toggle Logic
    let togglePasswordBtn = document.getElementById('togglePasswordBtn');
    let adminPasswordInput = document.getElementById('adminPassword');

    if (togglePasswordBtn && adminPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            let type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            adminPasswordInput.setAttribute('type', type);
            togglePasswordBtn.innerText = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // 1. ஆரம்பத்தில் லாகின் மோடலை மட்டுமே கட்டாயமாக காட்டுதல்
    if (loginModal) loginModal.style.display = 'flex';
    if (dashboardContent) dashboardContent.style.display = 'none';

    setTimeout(() => {
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 500);
        }
    }, 2000);

    document.getElementById('loginBtn')?.addEventListener('click', handleAdminLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleAdminLogout);
});

async function handleAdminLogin() {
    let email = document.getElementById('adminEmail').value.trim();
    let password = document.getElementById('adminPassword').value.trim();
    let errorElem = document.getElementById('loginError');

    if (!email || !password) {
        errorElem.innerText = 'தயவுசெய்து Email மற்றும் Password இரண்டையும் உள்ளிடவும்!';
        return;
    }

    try {
        errorElem.style.color = '#f59e0b';
        errorElem.innerText = 'சரிபார்க்கிறது...';
        
        await signInWithEmailAndPassword(auth, email, password);
        
        errorElem.style.color = '#34d399';
        errorElem.innerText = 'வெற்றிகரமாக உள்நுழைந்துவிட்டது!';
        
        // லாகின் வெற்றிகரமாக முடிந்ததும் லாகின் மோடலை மூடிவிட்டு டேஷ்போர்டைக் காட்டுதல்
        setTimeout(() => {
            let loginModal = document.getElementById('loginModal');
            let dashboardContent = document.getElementById('dashboardContent');
            
            if (loginModal) loginModal.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';
            
            initializeAppData();
        }, 600);

    } catch (error) {
        console.error("Login error code:", error.code);
        errorElem.style.color = '#ef4444';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorElem.innerText = 'தவறான Email அல்லது Password!';
        } else {
            errorElem.innerText = 'லாகின் செய்ய முடியவில்லை! மீண்டும் முயற்சிக்கவும்.';
        }
    }
}

async function handleAdminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            document.getElementById('dashboardContent').style.display = 'none';
            document.getElementById('loginModal').style.display = 'flex';
            document.getElementById('adminPassword').value = '';
            document.getElementById('loginError').innerText = '';
        } catch (error) {
            console.error("Logout error:", error);
        }
    }
}

function initializeAppData() {
    let todayStr = new Date().toISOString().split('T')[0];
    let dateInput = document.getElementById('reportFilterDate');
    if (dateInput) {
        dateInput.value = todayStr;
        dateInput.addEventListener('change', generateOverallSummaryReport);
    }

    setupStaticEventListeners();
    fetchHotelsFromFirestore();
    fetchStaffFromFirestore();
    fetchSalesFromFirestore();
}

function setupStaticEventListeners() {
    document.getElementById('addHotelBtn')?.addEventListener('click', openAddHotelModal);
    document.getElementById('closeHotelModalBtn')?.addEventListener('click', closeHotelModal);
    document.getElementById('saveHotelBtn')?.addEventListener('click', saveHotel);

    document.getElementById('addStaffBtn')?.addEventListener('click', openAddStaffModal);
    document.getElementById('closeStaffModalBtn')?.addEventListener('click', closeStaffModal);
    document.getElementById('saveStaffBtn')?.addEventListener('click', saveStaff);

    document.getElementById('closeSalaryModalBtn')?.addEventListener('click', closeSalaryModal);
    document.getElementById('saveSalaryBtn')?.addEventListener('click', processSalaryPayment);

    document.getElementById('closeBillingModalBtn')?.addEventListener('click', closeBillingModal);
    document.getElementById('cancelBillingBtn')?.addEventListener('click', closeBillingModal);
    document.getElementById('generateBillBtn')?.addEventListener('click', generateAndShareBill);

    document.getElementById('exportImgBtn')?.addEventListener('click', exportSummaryImage);
    document.getElementById('sendWaBtn')?.addEventListener('click', sendReportToWhatsApp);

    document.getElementById('commonPaperRate')?.addEventListener('input', applyCommonPaperRate);
    document.getElementById('customerPaid')?.addEventListener('input', calculateFinalSummary);
}

function generateOverallSummaryReport() {
    let tbody = document.getElementById('overallReportBody');
    let dateInput = document.getElementById('reportFilterDate');
    let dateStrElem = document.getElementById('selectedReportDateStr');

    if (!tbody || !dateInput) return;

    let selectedDate = dateInput.value;
    if (dateStrElem) dateStrElem.innerText = selectedDate;

    tbody.innerHTML = '';

    if (allHotelsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#9ca3af;">No hotel records available.</td></tr>';
        return;
    }

    let count = 1;
    let anyDataFound = false;

    allHotelsData.forEach(hotel => {
        let hotelSalesForDate = allSalesData.filter(s => s.hotelName === hotel.hotelName && s.date === selectedDate);

        let productMap = {};
        let totalBillSum = 0;
        let totalPaidSum = 0;

        hotelSalesForDate.forEach(sale => {
            totalBillSum += (sale.itemsTotal || 0);
            totalPaidSum += (sale.paid || 0);

            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(it => {
                    if (!productMap[it.name]) productMap[it.name] = 0;
                    productMap[it.name] += (it.weight || 0);
                });
            }
        });

        let productsHtml = '';
        let pKeys = Object.keys(productMap);
        if (pKeys.length > 0) {
            anyDataFound = true;
            pKeys.forEach(pName => {
                productsHtml += `<span class="item-badge">▪️ ${pName}: <b>${productMap[pName].toFixed(2)} kg</b></span>`;
            });
        } else {
            productsHtml = '<span style="color:#9ca3af;">No recent items</span>';
        }

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${count++}</td>
            <td><b>${hotel.hotelName}</b><br><span style="font-size:10px; color:#9ca3af;">${hotel.customerName || ''}</span></td>
            <td>${productsHtml}</td>
            <td><b>₹${totalBillSum.toFixed(2)}</b></td>
            <td style="color:#34d399;">₹${totalPaidSum.toFixed(2)}</td>
            <td style="color:#f87171; font-weight:bold;">₹${(hotel.oldBalance || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (!anyDataFound && allHotelsData.length > 0) {
        tbody.innerHTML += `<tr><td colspan="6" style="text-align:center; color:#f59e0b; font-size:11px; padding:8px;">⚠️ No bills created on ${selectedDate}</td></tr>`;
    }
}

function exportSummaryImage() {
    let reportElem = document.getElementById('summaryReportContainer');
    let dateInput = document.getElementById('reportFilterDate');
    let selectedDate = dateInput ? dateInput.value : 'Report';

    if (!reportElem) return;

    html2canvas(reportElem, { scale: 2, backgroundColor: '#111827' }).then(canvas => {
        let link = document.createElement('a');
        link.download = `Halal_Broilers_Report_${selectedDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function sendReportToWhatsApp() {
    let reportElem = document.getElementById('summaryReportContainer');
    let dateInput = document.getElementById('reportFilterDate');
    let selectedDate = dateInput ? dateInput.value : 'Report';

    if (!reportElem) return;

    html2canvas(reportElem, { scale: 2, backgroundColor: '#111827' }).then(canvas => {
        canvas.toBlob(blob => {
            let file = new File([blob], `Halal_Broilers_Report_${selectedDate}.png`, { type: 'image/png' });
            let message = encodeURIComponent(`*HALAL BROILERS* 🍗\nDaily Sales Summary\nDate: ${selectedDate}`);

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Halal Broilers Report', text: `Daily Report for ${selectedDate}` }).catch(err => console.log(err));
            } else {
                let link = document.createElement('a');
                link.download = `Halal_Broilers_Report_${selectedDate}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
                window.open(`https://wa.me/?text=${message}`, '_blank');
            }
        });
    });
}

function fetchSalesFromFirestore() {
    onSnapshot(collection(db, "sales"), (snapshot) => {
        allSalesData = [];
        snapshot.forEach(docSnap => {
            let sale = docSnap.data();
            sale.id = docSnap.id;
            allSalesData.push(sale);
        });
        generateOverallSummaryReport();
    });
}

function fetchHotelsFromFirestore() {
    let list = document.getElementById('hotelList');
    if (!list) return;

    onSnapshot(collection(db, "hotels"), (snapshot) => {
        list.innerHTML = '';
        allHotelsData = [];

        if (snapshot.empty) {
            list.innerHTML = '<li style="text-align:center; color:#9ca3af; font-size:12px; padding:10px;">No hotels found.</li>';
            generateOverallSummaryReport();
            return;
        }

        snapshot.forEach(docSnap => {
            let hotel = docSnap.data();
            hotel.docId = docSnap.id;
            allHotelsData.push(hotel);

            let li = document.createElement('li');
            li.className = 'hotel-item';
            
            li.innerHTML = `
                <div class="hotel-info">
                    <h4>🏨 ${hotel.hotelName}</h4>
                    <p>👤 ${hotel.customerName || ''} | 📞 ${hotel.contactNumber || 'N/A'}</p>
                    <p style="font-size:10px; color:#9ca3af;">📍 ${hotel.address || ''}</p>
                    <p>Old Balance: <span class="balance-tag">₹${(hotel.oldBalance || 0).toFixed(2)}</span></p>
                </div>
                <div class="actions">
                    <button class="btn-sm btn-action-bill btn-bill-act">Next Bill 🧾</button>
                    <button class="btn-sm btn-action-edit btn-edit-act">✏️ Edit</button>
                    <button class="btn-sm btn-action-del btn-del-act">🗑️ Delete</button>
                </div>
            `;

            li.querySelector('.btn-bill-act').onclick = () => openBillingModal(hotel);
            li.querySelector('.btn-edit-act').onclick = () => editHotel(hotel);
            li.querySelector('.btn-del-act').onclick = () => deleteHotel(hotel.docId);

            list.appendChild(li);
        });

        generateOverallSummaryReport();
    });
}

function openAddHotelModal() {
    let modal = document.getElementById('hotelModal');
    if (modal) {
        document.getElementById('hotelModalTitle').innerText = '➕ Add Hotel';
        document.getElementById('editHotelId').value = '';
        document.getElementById('hotelName').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('contactNumber').value = '';
        document.getElementById('address').value = '';
        document.getElementById('oldBalance').value = '';
        modal.style.display = 'flex';
    }
}

function closeHotelModal() {
    let modal = document.getElementById('hotelModal');
    if (modal) modal.style.display = 'none';
}

async function saveHotel() {
    let docId = document.getElementById('editHotelId').value;
    let name = document.getElementById('hotelName').value.trim();
    let customer = document.getElementById('customerName').value.trim();
    let contact = document.getElementById('contactNumber').value.trim();
    let address = document.getElementById('address').value.trim();
    let oldBal = parseFloat(document.getElementById('oldBalance').value) || 0;

    if (!name || !customer || !contact || !address) {
        alert('Please fill all details!');
        return;
    }

    let hotelData = {
        hotelName: name,
        customerName: customer,
        contactNumber: contact,
        address: address,
        oldBalance: oldBal,
        updatedAt: serverTimestamp()
    };

    try {
        if (docId) {
            await updateDoc(doc(db, "hotels", docId), hotelData);
        } else {
            await addDoc(collection(db, "hotels"), hotelData);
        }
        closeHotelModal();
    } catch (e) {
        console.error(e);
    }
}

function editHotel(hotel) {
    document.getElementById('hotelModalTitle').innerText = '✏️ Edit Hotel';
    document.getElementById('editHotelId').value = hotel.docId;
    document.getElementById('hotelName').value = hotel.hotelName || '';
    document.getElementById('customerName').value = hotel.customerName || '';
    document.getElementById('contactNumber').value = hotel.contactNumber || '';
    document.getElementById('address').value = hotel.address || '';
    document.getElementById('oldBalance').value = hotel.oldBalance || '';
    document.getElementById('hotelModal').style.display = 'flex';
}

async function deleteHotel(docId) {
    if (confirm('Delete this hotel?')) {
        await deleteDoc(doc(db, "hotels", docId));
    }
}

function openAddStaffModal() {
    let modal = document.getElementById('staffModal');
    if (modal) {
        document.getElementById('staffModalTitle').innerText = '➕ Add Staff';
        document.getElementById('editStaffId').value = '';
        document.getElementById('staffName').value = '';
        document.getElementById('staffMobile').value = '';
        document.getElementById('staffRole').value = 'Billing Staff';
        document.getElementById('staffSalary').value = '';
        document.getElementById('staffStatus').value = 'Active';
        modal.style.display = 'flex';
    }
}

function closeStaffModal() {
    let modal = document.getElementById('staffModal');
    if (modal) modal.style.display = 'none';
}

async function saveStaff() {
    let docId = document.getElementById('editStaffId').value;
    let name = document.getElementById('staffName').value.trim();
    let mobile = document.getElementById('staffMobile').value.trim();
    let role = document.getElementById('staffRole').value;
    let salary = parseFloat(document.getElementById('staffSalary').value) || 0;
    let status = document.getElementById('staffStatus').value;

    if (!name || !mobile) {
        alert('Enter staff name and mobile!');
        return;
    }

    let staffData = { name, mobile, role, monthlySalary: salary, status, updatedAt: serverTimestamp() };

    try {
        if (docId) {
            await updateDoc(doc(db, "staff", docId), staffData);
        } else {
            staffData.paidSalary = 0;
            await addDoc(collection(db, "staff"), staffData);
        }
        closeStaffModal();
    } catch (e) {
        console.error(e);
    }
}

function fetchStaffFromFirestore() {
    let container = document.getElementById('staffListContainer');
    if (!container) return;

    onSnapshot(collection(db, "staff"), (snapshot) => {
        container.innerHTML = '';
        allStaffData = [];
        let totalCount = 0, totalPending = 0;

        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#9ca3af; font-size:12px; text-align:center; grid-column: 1/-1;">No staff records found.</p>';
            document.getElementById('totalStaffCount').innerText = '0';
            document.getElementById('totalPendingSalary').innerText = '₹0.00';
            return;
        }

        snapshot.forEach(docSnap => {
            let staff = docSnap.data();
            staff.docId = docSnap.id;
            allStaffData.push(staff);
            totalCount++;

            let monthly = staff.monthlySalary || 0;
            let paid = staff.paidSalary || 0;
            let pending = monthly - paid;
            totalPending += pending;

            let div = document.createElement('div');
            div.className = 'staff-card-box';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4>👤 ${staff.name}</h4>
                        <p>${staff.role} | 📞 ${staff.mobile}</p>
                    </div>
                    <span style="font-size:9px; padding:3px 6px; border-radius:4px; font-weight:bold; background:${staff.status === 'Active' ? '#064e3b' : '#7f1d1d'}; color:${staff.status === 'Active' ? '#34d399' : '#fca5a5'};">${staff.status}</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; font-size:10px; text-align:center; margin:8px 0; background:#07090e; padding:6px; border-radius:6px;">
                    <div><span style="color:#9ca3af; display:block;">MONTHLY</span>₹${monthly}</div>
                    <div><span style="color:#9ca3af; display:block;">PAID</span>₹${paid}</div>
                    <div><span style="color:#9ca3af; display:block;">PENDING</span><strong style="color:#f59e0b;">₹${pending}</strong></div>
                </div>
                <div class="actions">
                    <button class="btn-sm btn-primary-glass btn-salary-act" style="flex:1;">💵 Salary</button>
                    <button class="btn-sm btn-action-edit btn-staff-edit-act">✏️ Edit</button>
                    <button class="btn-sm btn-action-del btn-staff-del-act">🗑️ Delete</button>
                </div>
            `;

            div.querySelector('.btn-salary-act').onclick = () => openSalaryModal(staff);
            div.querySelector('.btn-staff-edit-act').onclick = () => editStaff(staff);
            div.querySelector('.btn-staff-del-act').onclick = () => deleteStaff(staff.docId);

            container.appendChild(div);
        });

        document.getElementById('totalStaffCount').innerText = totalCount;
        document.getElementById('totalPendingSalary').innerText = `₹${totalPending.toFixed(2)}`;
    });
}

function editStaff(staff) {
    document.getElementById('staffModalTitle').innerText = '✏️ Edit Staff';
    document.getElementById('editStaffId').value = staff.docId;
    document.getElementById('staffName').value = staff.name || '';
    document.getElementById('staffMobile').value = staff.mobile || '';
    document.getElementById('staffRole').value = staff.role || 'Billing Staff';
    document.getElementById('staffSalary').value = staff.monthlySalary || '';
    document.getElementById('staffStatus').value = staff.status || 'Active';
    document.getElementById('staffModal').style.display = 'flex';
}

async function deleteStaff(docId) {
    if (confirm('Delete staff?')) {
        await deleteDoc(doc(db, "staff", docId));
    }
}

function openSalaryModal(staff) {
    document.getElementById('payStaffId').value = staff.docId;
    let monthly = staff.monthlySalary || 0;
    let paid = staff.paidSalary || 0;
    let pending = monthly - paid;

    document.getElementById('payStaffInfo').innerHTML = `
        <h4 style="color:#fff; margin-bottom:3px;">${staff.name} (${staff.role})</h4>
        <p style="font-size:11px; color:#9ca3af;">Monthly: ₹${monthly} | Paid: ₹${paid} | Pending: <strong style="color:#f59e0b;">₹${pending}</strong></p>
    `;
    document.getElementById('payAmount').value = '';
    document.getElementById('salaryModal').style.display = 'flex';
}

function closeSalaryModal() {
    document.getElementById('salaryModal').style.display = 'none';
}

async function processSalaryPayment() {
    let docId = document.getElementById('payStaffId').value;
    let amount = parseFloat(document.getElementById('payAmount').value) || 0;
    if (amount <= 0) {
        alert('Enter valid amount!');
        return;
    }

    let staffDoc = allStaffData.find(s => s.docId === docId);
    if (!staffDoc) return;

    let newPaid = (staffDoc.paidSalary || 0) + amount;
    await updateDoc(doc(db, "staff", docId), { paidSalary: newPaid });

    closeSalaryModal();
    alert('Salary recorded!');
}

function openBillingModal(hotel) {
    activeHotel = hotel;
    document.getElementById('bHotelName').innerText = hotel.hotelName || '';
    document.getElementById('bCustomerName').innerText = hotel.customerName || '';
    document.getElementById('bAddress').innerText = hotel.address || '';
    document.getElementById('bOldBalance').innerText = (hotel.oldBalance || 0).toFixed(2);

    let todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('billDate').value = todayStr;
    document.getElementById('customerPaid').value = '';
    
    let commonInput = document.getElementById('commonPaperRate');
    if (commonInput) commonInput.value = '';

    buildCartTable();
    calculateFinalSummary();
    document.getElementById('billingModal').style.display = 'flex';
}

function closeBillingModal() {
    document.getElementById('billingModal').style.display = 'none';
}

function buildCartTable() {
    let tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';

    PRODUCTS.forEach((p, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:left; font-weight:600;">${index + 1}. ${p.name}</td>
            <td><input type="number" id="paper_${p.id}" value="" step="0.1"></td>
            <td><input type="number" id="est_${p.id}" value="" step="0.1"></td>
            <td><input type="number" id="wt_${p.id}" value="" step="0.01"></td>
            <td id="amt_${p.id}" style="font-weight:bold; color:#059669;">0.00</td>
        `;

        tr.querySelector(`#paper_${p.id}`).oninput = () => calculateRow(p.id, p.type);
        tr.querySelector(`#est_${p.id}`).oninput = () => calculateRow(p.id, p.type);
        tr.querySelector(`#wt_${p.id}`).oninput = () => calculateRow(p.id, p.type);

        tbody.appendChild(tr);
    });
}

function applyCommonPaperRate() {
    let commonRate = parseFloat(document.getElementById('commonPaperRate').value) || 0;
    PRODUCTS.forEach(p => {
        if (p.type === 'formula1') {
            let paperInput = document.getElementById(`paper_${p.id}`);
            if (paperInput) {
                paperInput.value = commonRate > 0 ? commonRate : '';
                calculateRow(p.id, p.type);
            }
        }
    });
}

function calculateRow(id, type) {
    let paper = parseFloat(document.getElementById(`paper_${id}`).value) || 0;
    let est = parseFloat(document.getElementById(`est_${id}`).value) || 0;
    let wt = parseFloat(document.getElementById(`wt_${id}`).value) || 0;

    let amount = 0;
    if (type === 'formula1') amount = paper * est * wt;
    else if (type === 'formula2') amount = est * wt;

    document.getElementById(`amt_${id}`).innerText = amount.toFixed(2);
    calculateFinalSummary();
}

function calculateFinalSummary() {
    let itemsTotal = 0;
    PRODUCTS.forEach(p => {
        let amt = parseFloat(document.getElementById(`amt_${p.id}`).innerText) || 0;
        itemsTotal += amt;
    });

    let oldBal = activeHotel ? (activeHotel.oldBalance || 0) : 0;
    let paid = parseFloat(document.getElementById('customerPaid').value) || 0;
    let finalBal = oldBal + itemsTotal - paid;

    document.getElementById('itemsTotalAmt').innerText = itemsTotal.toFixed(2);
    document.getElementById('summaryOldBal').innerText = oldBal.toFixed(2);
    document.getElementById('summaryPaid').innerText = paid.toFixed(2);
    document.getElementById('finalBalanceAmt').innerText = finalBal.toFixed(2);
}

async function generateAndShareBill() {
    let itemsTotal = parseFloat(document.getElementById('itemsTotalAmt').innerText);
    let oldBal = activeHotel.oldBalance || 0;
    let paid = parseFloat(document.getElementById('customerPaid').value) || 0;
    let finalBal = parseFloat(document.getElementById('finalBalanceAmt').innerText);
    let billDate = document.getElementById('billDate').value;

    let billedItems = [];
    PRODUCTS.forEach(p => {
        let wt = parseFloat(document.getElementById(`wt_${p.id}`).value) || 0;
        let amt = parseFloat(document.getElementById(`amt_${p.id}`).innerText) || 0;
        if (wt > 0 || amt > 0) {
            billedItems.push({ name: p.name, weight: wt, total: amt });
        }
    });

    document.getElementById('rDateStr').innerText = billDate;
    document.getElementById('rHotelName').innerText = activeHotel.hotelName;
    document.getElementById('rCustomerName').innerText = `${activeHotel.customerName || ''} (${activeHotel.contactNumber || ''})`;
    document.getElementById('rAddress').innerText = activeHotel.address || '';

    document.getElementById('rItemsTotal').innerText = itemsTotal.toFixed(2);
    document.getElementById('rOldBal').innerText = oldBal.toFixed(2);
    document.getElementById('rPaid').innerText = paid.toFixed(2);
    document.getElementById('rFinalBal').innerText = finalBal.toFixed(2);

    let rTableBody = document.getElementById('rTableBody');
    rTableBody.innerHTML = '';

    let count = 1;
    billedItems.forEach(it => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${count++}</td><td><b>${it.name}</b></td><td>${it.weight} kg</td><td><b>₹${it.total.toFixed(2)}</b></td>`;
        rTableBody.appendChild(tr);
    });

    await addDoc(collection(db, "sales"), {
        date: billDate, hotelName: activeHotel.hotelName, items: billedItems,
        itemsTotal: itemsTotal, paid: paid, finalBalance: finalBal, timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, "hotels", activeHotel.docId), { oldBalance: finalBal });

    let receiptElement = document.getElementById('receiptTemplate');
    receiptElement.style.left = '0';

    html2canvas(receiptElement, { scale: 2 }).then(canvas => {
        receiptElement.style.left = '-9999px';

        canvas.toBlob(blob => {
            let file = new File([blob], `Bill_${activeHotel.hotelName}_${billDate}.png`, { type: 'image/png' });
            let cleanPhone = activeHotel.contactNumber ? activeHotel.contactNumber.replace(/\D/g, '') : '';
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            let message = encodeURIComponent(`*HALAL BROILERS* 🍗\nDate: ${billDate}\nHotel: ${activeHotel.hotelName}\nBill: ₹${itemsTotal.toFixed(2)}\nBalance: ₹${finalBal.toFixed(2)}`);

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Bill', text: `${activeHotel.hotelName}` }).catch(err => console.log(err));
            } else {
                let link = document.createElement('a');
                link.download = `Bill_${activeHotel.hotelName}_${billDate}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }

            if (cleanPhone) {
                window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
            }

            closeBillingModal();
        });
    });
}