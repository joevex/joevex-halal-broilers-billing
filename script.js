import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

window.addEventListener('DOMContentLoaded', () => {
    fetchHotelsFromFirestore();
    fetchStaffFromFirestore();
});

// --- HOTEL MANAGEMENT LOGIC ---
window.openAddHotelModal = function() {
    document.getElementById('hotelModalTitle').innerText = '➕ Add Hotel';
    document.getElementById('editHotelId').value = '';
    document.getElementById('hotelName').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('address').value = '';
    document.getElementById('oldBalance').value = '';
    document.getElementById('hotelModal').style.display = 'flex';
};

window.closeHotelModal = function() {
    document.getElementById('hotelModal').style.display = 'none';
};

window.saveHotel = async function() {
    let docId = document.getElementById('editHotelId').value;
    let name = document.getElementById('hotelName').value.trim();
    let customer = document.getElementById('customerName').value.trim();
    let contact = document.getElementById('contactNumber').value.trim();
    let address = document.getElementById('address').value.trim();
    let oldBal = parseFloat(document.getElementById('oldBalance').value) || 0;

    if (!name || !customer || !contact || !address) {
        alert('Please fill all details including contact number!');
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
        window.closeHotelModal();
    } catch (e) {
        console.error("Error saving hotel: ", e);
    }
};

function fetchHotelsFromFirestore() {
    let list = document.getElementById('hotelList');
    if (!list) return;

    onSnapshot(collection(db, "hotels"), (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li style="text-align:center; color:#9ca3af; font-size:13px; padding:10px;">No hotels found.</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            let hotel = docSnap.data();
            hotel.docId = docSnap.id;

            let li = document.createElement('li');
            li.className = 'hotel-item';
            li.innerHTML = `
                <div class="hotel-info">
                    <h4>🏨 ${hotel.hotelName}</h4>
                    <p>👤 ${hotel.customerName} | 📞 ${hotel.contactNumber || 'N/A'}</p>
                    <p style="font-size:11px; color:#9ca3af;">📍 ${hotel.address}</p>
                    <p>Old Balance: <span class="balance-tag">₹${(hotel.oldBalance || 0).toFixed(2)}</span></p>
                </div>
                <div class="actions">
                    <button class="btn-sm btn-bill" onclick='window.openBillingModal(${JSON.stringify(hotel)})'>Next Bill 🧾</button>
                    <button class="btn-sm btn-edit" onclick='window.editHotel(${JSON.stringify(hotel)})'>✏️</button>
                    <button class="btn-sm btn-del" onclick='window.deleteHotel("${hotel.docId}")'>🗑️</button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

window.editHotel = function(hotel) {
    document.getElementById('hotelModalTitle').innerText = '✏️ Edit Hotel';
    document.getElementById('editHotelId').value = hotel.docId;
    document.getElementById('hotelName').value = hotel.hotelName;
    document.getElementById('customerName').value = hotel.customerName;
    document.getElementById('contactNumber').value = hotel.contactNumber || '';
    document.getElementById('address').value = hotel.address;
    document.getElementById('oldBalance').value = hotel.oldBalance || '';
    document.getElementById('hotelModal').style.display = 'flex';
};

window.deleteHotel = async function(docId) {
    if (confirm('Do you want to delete this hotel?')) {
        await deleteDoc(doc(db, "hotels", docId));
    }
};

// --- STAFF MANAGEMENT LOGIC ---
window.openAddStaffModal = function() {
    document.getElementById('staffModalTitle').innerText = '➕ Add Staff Profile';
    document.getElementById('editStaffId').value = '';
    document.getElementById('staffName').value = '';
    document.getElementById('staffMobile').value = '';
    document.getElementById('staffRole').value = 'Billing Staff';
    document.getElementById('staffSalary').value = '';
    document.getElementById('staffStatus').value = 'Active';
    document.getElementById('staffModal').style.display = 'flex';
};

window.closeStaffModal = function() {
    document.getElementById('staffModal').style.display = 'none';
};

window.saveStaff = async function() {
    let docId = document.getElementById('editStaffId').value;
    let name = document.getElementById('staffName').value.trim();
    let mobile = document.getElementById('staffMobile').value.trim();
    let role = document.getElementById('staffRole').value;
    let salary = parseFloat(document.getElementById('staffSalary').value) || 0;
    let status = document.getElementById('staffStatus').value;

    if (!name || !mobile) {
        alert('Please enter staff name and mobile number!');
        return;
    }

    let staffData = {
        name,
        mobile,
        role,
        monthlySalary: salary,
        status,
        updatedAt: serverTimestamp()
    };

    try {
        if (docId) {
            await updateDoc(doc(db, "staff", docId), staffData);
        } else {
            staffData.paidSalary = 0;
            await addDoc(collection(db, "staff"), staffData);
        }
        window.closeStaffModal();
    } catch (e) {
        console.error("Error saving staff: ", e);
    }
};

function fetchStaffFromFirestore() {
    let container = document.getElementById('staffListContainer');
    if (!container) return;

    onSnapshot(collection(db, "staff"), (snapshot) => {
        container.innerHTML = '';
        allStaffData = [];
        let totalCount = 0, totalPending = 0;

        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#9ca3af; font-size:13px; text-align:center; grid-column: 1/-1;">No staff records found.</p>';
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
                    <span style="font-size:10px; padding:3px 8px; border-radius:4px; font-weight:bold; background:${staff.status === 'Active' ? '#064e3b' : '#7f1d1d'}; color:${staff.status === 'Active' ? '#34d399' : '#fca5a5'};">${staff.status}</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; font-size:11px; text-align:center; margin:10px 0; background:#111827; padding:8px; border-radius:6px;">
                    <div><span style="color:#9ca3af; display:block;">MONTHLY</span>₹${monthly}</div>
                    <div><span style="color:#9ca3af; display:block;">PAID</span>₹${paid}</div>
                    <div><span style="color:#9ca3af; display:block;">PENDING</span><strong style="color:#f59e0b;">₹${pending}</strong></div>
                </div>
                <div class="actions">
                    <button class="btn-sm btn-primary" style="flex:1; background:#b45309;" onclick='window.openSalaryModal(${JSON.stringify(staff)})'>💵 Salary</button>
                    <button class="btn-sm btn-edit" onclick='window.editStaff(${JSON.stringify(staff)})'>✏️</button>
                    <button class="btn-sm btn-del" onclick='window.deleteStaff("${staff.docId}")'>🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });

        document.getElementById('totalStaffCount').innerText = totalCount;
        document.getElementById('totalPendingSalary').innerText = `₹${totalPending.toFixed(2)}`;
    });
};

window.editStaff = function(staff) {
    document.getElementById('staffModalTitle').innerText = '✏️ Edit Staff Profile';
    document.getElementById('editStaffId').value = staff.docId;
    document.getElementById('staffName').value = staff.name;
    document.getElementById('staffMobile').value = staff.mobile;
    document.getElementById('staffRole').value = staff.role;
    document.getElementById('staffSalary').value = staff.monthlySalary;
    document.getElementById('staffStatus').value = staff.status;
    document.getElementById('staffModal').style.display = 'flex';
};

window.deleteStaff = async function(docId) {
    if (confirm('Do you want to delete this staff?')) {
        await deleteDoc(doc(db, "staff", docId));
    }
};

window.openSalaryModal = function(staff) {
    document.getElementById('payStaffId').value = staff.docId;
    let monthly = staff.monthlySalary || 0;
    let paid = staff.paidSalary || 0;
    let pending = monthly - paid;

    document.getElementById('payStaffInfo').innerHTML = `
        <h4 style="color:#fff; margin-bottom:4px;">${staff.name} (${staff.role})</h4>
        <p style="font-size:12px; color:#9ca3af;">Monthly: ₹${monthly} | Paid: ₹${paid} | Pending: <strong style="color:#f59e0b;">₹${pending}</strong></p>
    `;
    document.getElementById('payAmount').value = '';
    document.getElementById('salaryModal').style.display = 'flex';
};

window.closeSalaryModal = function() {
    document.getElementById('salaryModal').style.display = 'none';
};

window.processSalaryPayment = async function() {
    let docId = document.getElementById('payStaffId').value;
    let amount = parseFloat(document.getElementById('payAmount').value) || 0;
    if (amount <= 0) {
        alert('Please enter valid amount!');
        return;
    }

    let staffDoc = allStaffData.find(s => s.docId === docId);
    if (!staffDoc) return;

    let newPaid = (staffDoc.paidSalary || 0) + amount;

    await updateDoc(doc(db, "staff", docId), {
        paidSalary: newPaid
    });

    window.closeSalaryModal();
    alert('Salary payment recorded successfully!');
};

// --- BILLING LOGIC ---
window.openBillingModal = function(hotel) {
    activeHotel = hotel;
    document.getElementById('bHotelName').innerText = hotel.hotelName;
    document.getElementById('bCustomerName').innerText = hotel.customerName;
    document.getElementById('bAddress').innerText = hotel.address;
    document.getElementById('bOldBalance').innerText = (hotel.oldBalance || 0).toFixed(2);

    let todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('billDate').value = todayStr;
    document.getElementById('customerPaid').value = '';

    buildCartTable();
    window.calculateFinalSummary();
    document.getElementById('billingModal').style.display = 'flex';
};

window.closeBillingModal = function() {
    document.getElementById('billingModal').style.display = 'none';
};

function buildCartTable() {
    let tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';

    PRODUCTS.forEach((p, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:left; font-weight:600;">${index + 1}. ${p.name}</td>
            <td><input type="number" id="paper_${p.id}" value="" step="0.1" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
            <td><input type="number" id="est_${p.id}" value="" step="0.1" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
            <td><input type="number" id="wt_${p.id}" value="" step="0.01" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
            <td id="amt_${p.id}" style="font-weight:bold; color:#059669;">0.00</td>
        `;
        tbody.appendChild(tr);
    });
}

window.calculateRow = function(id, type) {
    let paper = parseFloat(document.getElementById(`paper_${id}`).value) || 0;
    let est = parseFloat(document.getElementById(`est_${id}`).value) || 0;
    let wt = parseFloat(document.getElementById(`wt_${id}`).value) || 0;

    let amount = 0;
    if (type === 'formula1') {
        amount = paper * est * wt;
    } else if (type === 'formula2') {
        amount = est * wt;
    }

    document.getElementById(`amt_${id}`).innerText = amount.toFixed(2);
    window.calculateFinalSummary();
};

window.calculateFinalSummary = function() {
    let itemsTotal = 0;
    PRODUCTS.forEach(p => {
        let amt = parseFloat(document.getElementById(`amt_${p.id}`).innerText) || 0;
        itemsTotal += amt;
    });

    let oldBal = activeHotel.oldBalance || 0;
    let paid = parseFloat(document.getElementById('customerPaid').value) || 0;
    let finalBal = oldBal + itemsTotal - paid;

    document.getElementById('itemsTotalAmt').innerText = itemsTotal.toFixed(2);
    document.getElementById('summaryOldBal').innerText = oldBal.toFixed(2);
    document.getElementById('summaryPaid').innerText = paid.toFixed(2);
    document.getElementById('finalBalanceAmt').innerText = finalBal.toFixed(2);
};

window.generateAndShareBill = async function() {
    let itemsTotal = parseFloat(document.getElementById('itemsTotalAmt').innerText);
    let oldBal = activeHotel.oldBalance || 0;
    let paid = parseFloat(document.getElementById('customerPaid').value) || 0;
    let finalBal = parseFloat(document.getElementById('finalBalanceAmt').innerText);
    let billDate = document.getElementById('billDate').value;

    document.getElementById('rDateStr').innerText = billDate;
    document.getElementById('rHotelName').innerText = activeHotel.hotelName;
    document.getElementById('rCustomerName').innerText = `${activeHotel.customerName} (${activeHotel.contactNumber || ''})`;
    document.getElementById('rAddress').innerText = activeHotel.address;

    document.getElementById('rItemsTotal').innerText = itemsTotal.toFixed(2);
    document.getElementById('rOldBal').innerText = oldBal.toFixed(2);
    document.getElementById('rPaid').innerText = paid.toFixed(2);
    document.getElementById('rFinalBal').innerText = finalBal.toFixed(2);

    let rTableBody = document.getElementById('rTableBody');
    rTableBody.innerHTML = '';

    let count = 1;
    PRODUCTS.forEach(p => {
        let wt = parseFloat(document.getElementById(`wt_${p.id}`).value) || 0;
        let amt = parseFloat(document.getElementById(`amt_${p.id}`).innerText) || 0;
        if (wt > 0 || amt > 0) {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${count++}</td>
                <td><b>${p.name}</b></td>
                <td>${wt} kg</td>
                <td><b>₹${amt.toFixed(2)}</b></td>
            `;
            rTableBody.appendChild(tr);
        }
    });

    await addDoc(collection(db, "sales"), {
        date: billDate,
        hotelName: activeHotel.hotelName,
        itemsTotal: itemsTotal,
        paid: paid,
        finalBalance: finalBal,
        timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, "hotels", activeHotel.docId), {
        oldBalance: finalBal
    });

    let receiptElement = document.getElementById('receiptTemplate');
    receiptElement.style.left = '0';

    html2canvas(receiptElement, { scale: 2 }).then(canvas => {
        receiptElement.style.left = '-9999px';

        canvas.toBlob(blob => {
            let file = new File([blob], `Bill_${activeHotel.hotelName}_${billDate}.png`, { type: 'image/png' });
            
            let cleanPhone = activeHotel.contactNumber ? activeHotel.contactNumber.replace(/\D/g, '') : '';
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            let message = encodeURIComponent(`*HALAL BROILERS* 🍗\nDate: ${billDate}\nHotel: ${activeHotel.hotelName}\nBill Amount: ₹${itemsTotal.toFixed(2)}\nGrand Total Balance: ₹${finalBal.toFixed(2)}\nThank you! Visit again.`);

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Halal Broilers Bill',
                    text: `${activeHotel.hotelName} - Bill for ${billDate}`
                }).catch(err => console.log(err));
            } else {
                let link = document.createElement('a');
                link.download = `Bill_${activeHotel.hotelName}_${billDate}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }

            if (cleanPhone) {
                window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
            }

            window.closeBillingModal();
        });
    });
};