import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Your Firebase credentials
const firebaseConfig = {
    apiKey: "AIzaSyBTn3IkFFX7JEVOTbMfomoYzL_ymBy2dH8",
    authDomain: "halal-broilers-billing.firebaseapp.com",
    projectId: "halal-broilers-billing",
    storageBucket: "halal-broilers-billing.firebasestorage.app",
    messagingSenderId: "1011264761780",
    appId: "1:1011264761780:web:5e73201301d6ad8b054ce1",
    measurementId: "G-871L1DVP7C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 9 Products definition (1-5: Formula 1, 6-9: Formula 2)
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

// Start Real-time Data Sync
fetchHotelsFromFirestore();
fetchSalesHistoryFromFirestore();

window.openAddHotelModal = function() {
    document.getElementById('hotelModalTitle').innerText = '➕ Add Hotel';
    document.getElementById('editHotelId').value = '';
    document.getElementById('hotelName').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('address').value = '';
    document.getElementById('oldBalance').value = '0';
    document.getElementById('hotelModal').style.display = 'flex';
};

window.closeHotelModal = function() {
    document.getElementById('hotelModal').style.display = 'none';
};

window.saveHotel = async function() {
    let docId = document.getElementById('editHotelId').value;
    let name = document.getElementById('hotelName').value.trim();
    let customer = document.getElementById('customerName').value.trim();
    let address = document.getElementById('address').value.trim();
    let oldBal = parseFloat(document.getElementById('oldBalance').value) || 0;

    if (!name || !customer || !address) {
        alert('Please fill all details!');
        return;
    }

    let hotelData = {
        hotelName: name,
        customerName: customer,
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
            list.innerHTML = '<li style="text-align:center; color:#64748b; font-size:13px; padding:10px;">No hotels found.</li>';
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
                    <p>👤 Customer: ${hotel.customerName} | 📍 ${hotel.address}</p>
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
    document.getElementById('address').value = hotel.address;
    document.getElementById('oldBalance').value = hotel.oldBalance || 0;
    document.getElementById('hotelModal').style.display = 'flex';
};

window.deleteHotel = async function(docId) {
    if (confirm('Do you want to delete this hotel?')) {
        await deleteDoc(doc(db, "hotels", docId));
    }
};

let activeHotel = null;

window.openBillingModal = function(hotel) {
    activeHotel = hotel;
    document.getElementById('bHotelName').innerText = hotel.hotelName;
    document.getElementById('bCustomerName').innerText = hotel.customerName;
    document.getElementById('bAddress').innerText = hotel.address;
    document.getElementById('bOldBalance').innerText = (hotel.oldBalance || 0).toFixed(2);

    let todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('billDate').value = todayStr;
    document.getElementById('customerPaid').value = '0';

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
            <td><input type="number" id="paper_${p.id}" value="0" step="0.1" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
            <td><input type="number" id="est_${p.id}" value="0" step="0.1" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
            <td><input type="number" id="wt_${p.id}" value="0" step="0.01" oninput="window.calculateRow(${p.id}, '${p.type}')"></td>
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
    document.getElementById('rCustomerName').innerText = activeHotel.customerName;
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

    // Save Sale Record to Firestore
    await addDoc(collection(db, "sales"), {
        date: billDate,
        hotelName: activeHotel.hotelName,
        itemsTotal: itemsTotal,
        paid: paid,
        finalBalance: finalBal,
        timestamp: serverTimestamp()
    });

    // Update Hotel Old Balance in Firestore
    await updateDoc(doc(db, "hotels", activeHotel.docId), {
        oldBalance: finalBal
    });

    let receiptElement = document.getElementById('receiptTemplate');
    receiptElement.style.left = '0';

    html2canvas(receiptElement, { scale: 2 }).then(canvas => {
        receiptElement.style.left = '-9999px';

        canvas.toBlob(blob => {
            let file = new File([blob], `Bill_${activeHotel.hotelName}_${billDate}.png`, { type: 'image/png' });
            
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
                alert('Premium Bill Image downloaded successfully!');
            }
            window.closeBillingModal();
        });
    });
};

function fetchSalesHistoryFromFirestore() {
    let list = document.getElementById('salesHistoryList');
    if (!list) return;

    const q = query(collection(db, "sales"), orderBy("timestamp", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li style="text-align:center; color:#64748b; font-size:12px; padding:8px;">No sales records found.</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            let s = docSnap.data();
            let li = document.createElement('li');
            li.className = 'history-card';
            li.innerHTML = `
                <div>
                    <strong>${s.hotelName}</strong> (${s.date})
                    <div style="font-size:11px; color:#64748b;">Bill: ₹${(s.itemsTotal || 0).toFixed(2)} | Paid: ₹${(s.paid || 0).toFixed(2)}</div>
                </div>
                <div style="font-weight:bold; color:#dc2626;">Balance: ₹${(s.finalBalance || 0).toFixed(2)}</div>
            `;
            list.appendChild(li);
        });
    });
}