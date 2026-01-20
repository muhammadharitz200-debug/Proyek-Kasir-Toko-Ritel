// 1. INISIALISASI DATA (Pastikan Biaya Selalu Ada)
let db = JSON.parse(localStorage.getItem('kasir_pro_db')) || {
    stok: [],
    transaksi: [],
    biaya: []
};

// Pastikan jika user punya data lama, array biaya tetap terbuat
if (!db.biaya) db.biaya = [];

const infoToko = {
    nama: "TOKO HARITZ",
    alamat: "Jl. Kp. Sawah Jl. H. Gandil No.9, RT.02/RW.11, Cibinong, Kec. Cibinong",
    telp: "085974902810"
};

const formatIDR = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);
};

// 3. NAVIGASI HALAMAN
// 2. NAVIGASI HALAMAN (Fixed)
function showPage(pageName) {
    document.querySelectorAll('.page-content').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.menu-item').forEach(menu => menu.classList.remove('active'));

    const formattedId = pageName.replace(/\s+/g, '-');
    const targetPage = document.getElementById(`page-${formattedId}`);
    const targetMenu = document.getElementById(`menu-${formattedId}`);

    if (targetPage) targetPage.style.display = 'block';
    if (targetMenu) targetMenu.classList.add('active');
    
    if(document.getElementById('main-title')) document.getElementById('main-title').innerText = pageName;

    // Trigger Render Data
    if (formattedId === 'Dashboard') updateDashboard();
    if (formattedId === 'Stok') renderStokTable();
    if (formattedId === 'Transaksi') { populateProductSelect(); renderKeranjang(); }
    if (formattedId === 'Laporan-Laba-Rugi') renderLaporan();
    if (formattedId === 'Biaya-Operasional') renderBiayaTable();
}

// 4. MANAJEMEN STOK (FUNGSI ASLI DIJAGA)
function addStok() {
    const nama = document.getElementById('stok-nama').value;
    const jumlah = parseInt(document.getElementById('stok-jumlah').value);
    const modal = parseInt(document.getElementById('stok-modal').value);
    const jual = parseInt(document.getElementById('stok-jual').value);

    if (!nama || isNaN(jumlah) || isNaN(modal) || isNaN(jual)) {
        alert("Mohon isi semua data!");
        return;
    }

    db.stok.push({
        id: Date.now(),
        nama: nama,
        jumlah: jumlah,
        modal: modal,
        jual: jual,
        tanggalInput: new Date().toLocaleDateString('id-ID')
    });

    saveData();
    renderStokTable();
    document.querySelectorAll('.form-grid input').forEach(input => input.value = '');
}

function renderStokTable() {
    const tbody = document.querySelector('#table-stok tbody');
    if (!tbody) return;

    tbody.innerHTML = db.stok.map(item => `
        <tr>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700;">${item.nama}</span>
                    <small style="color: #64748b;">Update: ${item.tanggalInput || '-'}</small>
                </div>
            </td>
            <td><span class="stok-badge ${item.jumlah < 10 ? 'stok-kritis' : 'stok-aman'}">${item.jumlah} Pcs</span></td>
            <td>${formatIDR(item.modal)}</td>
            <td><b>${formatIDR(item.jual)}</b></td>
            <td>${formatIDR(item.modal * item.jumlah)}</td>
            <td><span style="color: var(--s-color); font-weight: 700;">+ ${formatIDR(item.jual - item.modal)}</span></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-icon" onclick="restokBarang(${item.id})" style="background: var(--s-color); color: white; padding: 4px; border-radius: 4px;" title="Restok">
                        <span class="material-icons-sharp" style="font-size: 18px;">add_box</span>
                    </button>

                    <button class="btn-icon" onclick="editHarga(${item.id})" style="background: #f59e0b; color: white; padding: 4px; border-radius: 4px; border:none; cursor:pointer;" title="Edit Harga">
                        <span class="material-icons-sharp" style="font-size: 18px;">edit</span>
                    </button>

                    <button class="btn-danger" onclick="hapusBarang(${item.id})" style="padding: 4px; border-radius: 4px;">
                        <span class="material-icons-sharp" style="font-size: 18px;">delete_sweep</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// TAMBAHKAN FUNGSI INI DI BAWAHNYA
function restokBarang(id) {
    const produk = db.stok.find(p => p.id === id);
    if (!produk) return;

    const tambahan = prompt(`RESTOK: ${produk.nama}\nStok saat ini: ${produk.jumlah}\n\nMasukkan jumlah stok tambahan:`, "0");
    
    if (tambahan === null) return; // Jika user klik cancel

    const jumlahBaru = parseInt(tambahan);

    if (!isNaN(jumlahBaru) && jumlahBaru > 0) {
        produk.jumlah += jumlahBaru;
        produk.tanggalInput = new Date().toLocaleDateString('id-ID'); // Update tanggal edit
        
        saveData();
        renderStokTable();
        updateDashboard(); // Agar angka stok menipis di dashboard ikut update
        alert(`Berhasil! Stok ${produk.nama} sekarang menjadi ${produk.jumlah} pcs.`);
    } else {
        alert("Input tidak valid. Masukkan angka positif.");
    }
}

function hapusBarang(id) {
    if (confirm("Hapus barang?")) {
        db.stok = db.stok.filter(item => item.id !== id);
        saveData();
        renderStokTable();
    }
}

// 5. TRANSAKSI & STRUK (HEADER TOKO DITAMBAHKAN)
let keranjangSementera = [];

function populateProductSelect() {
    const select = document.getElementById('kasir-pilih-produk');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Produk --</option>' + 
        db.stok.filter(s => s.jumlah > 0).map(item => `<option value="${item.id}">${item.nama} (Sisa: ${item.jumlah})</option>`).join('');
}

function prosesTransaksi() {
    const productId = document.getElementById('kasir-pilih-produk').value;
    const qty = parseInt(document.getElementById('kasir-qty').value);
    const produk = db.stok.find(s => s.id == productId);

    if (!produk || isNaN(qty) || qty <= 0) return alert("Pilih produk!");
    
    const itemExist = keranjangSementera.find(k => k.id === produk.id);
    if ((itemExist ? itemExist.qty + qty : qty) > produk.jumlah) return alert("Stok tidak cukup!");

    if (itemExist) {
        itemExist.qty += qty;
        itemExist.subtotal = itemExist.qty * produk.jual;
    } else {
        keranjangSementera.push({
            id: produk.id, nama: produk.nama, qty: qty,
            hargaJual: produk.jual, hargaModal: produk.modal, subtotal: produk.jual * qty
        });
    }
    renderKeranjang();
}

function renderKeranjang() {
    const container = document.getElementById('receipt-items');
    const totalDisplay = document.getElementById('total-tagihan');
    const tglReceipt = document.getElementById('receipt-date');
    
    if (tglReceipt) tglReceipt.innerText = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    if (keranjangSementera.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:10px; color:#999;">Keranjang Kosong</p>';
        totalDisplay.innerText = "Rp 0";
        return;
    }

    let total = 0;
    
    // Header Struk Profesional (Nama Toko)
    let contentHtml = `
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px;">
            <h3 style="margin: 0; font-size: 1rem; font-weight: 800;">${infoToko.nama}</h3>
            <p style="margin: 2px 0; font-size: 0.7rem;">${infoToko.alamat}</p>
            <p style="margin: 0; font-size: 0.7rem;">Telp: ${infoToko.telp}</p>
        </div>
        <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; display: flex; font-size: 0.75rem; font-weight: bold;">
            <span style="flex: 2;">ITEM</span>
            <span style="flex: 1; text-align: center;">QTY</span>
            <span style="flex: 1.5; text-align: right;">TOTAL</span>
        </div>
    `;

    contentHtml += keranjangSementera.map((item, index) => {
        total += item.subtotal;
        return `
            <div style="display: flex; font-size: 0.8rem; margin-bottom: 8px;">
                <div style="flex: 2;">
                    <div style="font-weight: 600;">${item.nama}</div>
                    <small style="color: #666;">@${formatIDR(item.hargaJual)}</small>
                </div>
                <div style="flex: 1; text-align: center;">${item.qty}</div>
                <div style="flex: 1.5; text-align: right; font-weight: 600;">${formatIDR(item.subtotal)}</div>
                <button onclick="hapusItemKeranjang(${index})" class="no-print" style="margin-left:8px; color:red; border:none; background:none; cursor:pointer;">x</button>
            </div>
        `;
    }).join('');

    container.innerHTML = contentHtml + `
        <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; text-align: center;">
            <p style="font-size: 0.7rem; font-style: italic;">Terima Kasih Telah Berbelanja!</p>
        </div>
    `;
    totalDisplay.innerText = formatIDR(total);
}

function hapusItemKeranjang(index) {
    keranjangSementera.splice(index, 1);
    renderKeranjang();
}

function finalisasiPembayaran() {
    if (keranjangSementera.length === 0) return alert("Keranjang kosong!");

    if (confirm("Selesaikan transaksi & Cetak Struk?")) {
        const sekarang = new Date();
        const tgl = sekarang.toLocaleDateString('id-ID');
        const jam = sekarang.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});

        keranjangSementera.forEach(item => {
            const p = db.stok.find(s => s.id === item.id);
            if (p) p.jumlah -= item.qty;

            db.transaksi.push({
                id: Date.now() + Math.random(),
                produk: item.nama, qty: item.qty, total: item.subtotal,
                laba: (item.hargaJual - item.hargaModal) * item.qty,
                tanggal: tgl, waktu: tgl + " " + jam
            });
        });

        saveData();
        window.print();
        
        keranjangSementera = [];
        renderKeranjang();
        populateProductSelect();
        updateDashboard();
    }
}

// 6. DASHBOARD & GRAFIK (TETAP BERFUNGSI)
function updateDashboard() {
    const totalOmzet = db.transaksi.reduce((acc, curr) => acc + curr.total, 0);
    const labaKotor = db.transaksi.reduce((acc, curr) => acc + curr.laba, 0);
    const totalBiaya = db.biaya.reduce((acc, curr) => acc + curr.jumlah, 0);
    const labaBersih = labaKotor - totalBiaya;
    const stokKritis = db.stok.filter(s => s.jumlah < 5).length;

    // Update Angka di Card
    if(document.getElementById('dash-omzet')) document.getElementById('dash-omzet').innerText = formatIDR(totalOmzet);
    if(document.getElementById('dash-biaya')) document.getElementById('dash-biaya').innerText = formatIDR(totalBiaya);
    if(document.getElementById('dash-laba')) document.getElementById('dash-laba').innerText = formatIDR(labaBersih);
    if(document.getElementById('dash-stok-low')) document.getElementById('dash-stok-low').innerText = stokKritis;

    renderVisualChart(); 
    updateTopProducts();
    
    const tbody = document.getElementById('table-riwayat');
    if (tbody) {
        tbody.innerHTML = db.transaksi.slice(-5).reverse().map(t => `
            <tr><td><b>${t.produk}</b></td><td>${t.qty}</td><td>${formatIDR(t.total)}</td><td><small>${t.tanggal}</small></td></tr>
        `).join('');
    }
}

function renderVisualChart() {
    const chartContainer = document.getElementById('bar-chart');
    if (!chartContainer) return;

    const labels = [];
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const tgl = d.toLocaleDateString('id-ID');
        labels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
        dailyData.push(db.transaksi.filter(t => t.tanggal === tgl).reduce((s, t) => s + t.total, 0));
    }

    const max = Math.max(...dailyData, 1000000);
    chartContainer.innerHTML = dailyData.map((val, i) => `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
            <div style="width:70%; background:var(--p-color); height:${(val/max)*100}%; border-radius:4px; min-height:2px;"></div>
            <span style="font-size:0.6rem; margin-top:5px;">${labels[i]}</span>
        </div>
    `).join('');
}

function updateTopProducts() {
    const list = document.getElementById('top-products-list');
    if (!list) return;
    const map = {};
    db.transaksi.forEach(t => map[t.produk] = (map[t.produk] || 0) + t.qty);
    const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5);
    list.innerHTML = sorted.map(([name, qty]) => `
        <div style="padding:10px; background:white; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between; border:1px solid #eee;">
            <b>${name}</b> <span>${qty} Terjual</span>
        </div>
    `).join('');
}

// 7. LAPORAN LABA RUGI (SINKRON)
function renderLaporan() {
    const tbody = document.getElementById('body-laporan');
    const filter = document.getElementById('filter-tanggal').value;
    if (!tbody) return;

    let dataTransaksi = db.transaksi;
    let dataBiaya = db.biaya;

    if (filter) {
        const [y, m, d] = filter.split('-');
        const tglFilter = `${parseInt(d)}/${parseInt(m)}/${y}`;
        dataTransaksi = db.transaksi.filter(t => t.tanggal === tglFilter);
        dataBiaya = db.biaya.filter(b => b.tanggal === tglFilter);
    }

    const tOmzet = dataTransaksi.reduce((acc, curr) => acc + curr.total, 0);
    const tLabaKotor = dataTransaksi.reduce((acc, curr) => acc + curr.laba, 0);
    const tBiaya = dataBiaya.reduce((acc, curr) => acc + curr.jumlah, 0);
    const tLabaBersih = tLabaKotor - tBiaya;

    // Render Tabel Transaksi
    tbody.innerHTML = dataTransaksi.slice().reverse().map(t => `
        <tr>
            <td><small>${t.waktu || t.tanggal}</small></td>
            <td><b>${t.produk}</b></td>
            <td>${t.qty}</td>
            <td>${formatIDR(t.total)}</td>
            <td>${formatIDR(t.total - t.laba)}</td>
            <td style="color:var(--s-color); font-weight:700;">+ ${formatIDR(t.laba)}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;">Tidak ada data.</td></tr>';

    // Update Header Laporan (Insights)
    if(document.getElementById('rep-omzet')) document.getElementById('rep-omzet').innerText = formatIDR(tOmzet);
    if(document.getElementById('rep-laba')) document.getElementById('rep-laba').innerText = formatIDR(tLabaBersih);
    if(document.getElementById('rep-terjual')) document.getElementById('rep-terjual').innerText = dataTransaksi.reduce((a,b) => a+b.qty, 0);
    
    // Tambahkan keterangan potongan biaya di bawah nominal laba jika diperlukan
    const elMargin = document.getElementById('rep-margin');
    if(elMargin) elMargin.innerText = `Biaya Operasional: -${formatIDR(tBiaya)}`;
}

// TAMBAHKAN FUNGSI CETAK INI DI BAGIAN BAWAH script.js
function cetakLaporanPerTanggal() {
    const filter = document.getElementById('filter-tanggal').value;
    const tglJudul = filter ? filter : "Semua Periode";
    const tbody = document.getElementById('body-laporan');
    
    if (tbody.rows.length === 0 || tbody.innerText.includes("Tidak ada data")) {
        alert("Tidak ada data untuk dicetak!");
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Cetak Laporan - ${infoToko.nama}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .footer { margin-top: 20px; text-align: right; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${infoToko.nama}</h1>
                <p>${infoToko.alamat}</p>
                <h2>LAPORAN PENJUALAN (${tglJudul})</h2>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Waktu</th>
                        <th>Produk</th>
                        <th>Qty</th>
                        <th>Omzet</th>
                        <th>Laba</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from(tbody.rows).map(row => `
                        <tr>
                            <td>${row.cells[0].innerText}</td>
                            <td>${row.cells[1].innerText}</td>
                            <td>${row.cells[2].innerText}</td>
                            <td>${row.cells[3].innerText}</td>
                            <td>${row.cells[5].innerText}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <p>Total Omzet: ${document.getElementById('rep-omzet').innerText}</p>
                <p>Total Laba Bersih: ${document.getElementById('rep-laba').innerText}</p>
            </div>
            <script>window.print(); window.close();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}


// 8. NOTIFIKASI
function updateNotifications() {
    const low = db.stok.filter(i => i.jumlah < 5);
    const badge = document.getElementById('notif-badge');
    const content = document.getElementById('notif-content');
    if (badge) badge.style.display = low.length > 0 ? 'block' : 'none';
    if (content) content.innerHTML = low.map(i => `<div style="padding:8px; border-bottom:1px solid #eee; color:red;"><strong>Stok Kritis!</strong><br>${i.nama} sisa ${i.jumlah}</div>`).join('') || '<p style="padding:10px;">Stok aman</p>';
}

function toggleNotif() {
    const d = document.getElementById('notif-dropdown');
    d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

// Fungsi Baru untuk Biaya
// 4. MANAJEMEN BIAYA (Fixed)
function addBiaya() {
    const elKategori = document.getElementById('operasional-nama');
    const elCatatan = document.getElementById('operasional-catatan');
    const elJumlah = document.getElementById('operasional-jumlah');

    if (!elKategori.value || !elJumlah.value) return alert("Isi kategori dan nominal!");

    const namaTampil = elCatatan.value ? `${elKategori.value} (${elCatatan.value})` : elKategori.value;

    db.biaya.push({
        id: Date.now(),
        tanggal: new Date().toLocaleDateString('id-ID'),
        nama: namaTampil,
        jumlah: parseInt(elJumlah.value)
    });

    saveData();
    renderBiayaTable();
    updateDashboard();

    elKategori.value = '';
    elCatatan.value = '';
    elJumlah.value = '';
}

function renderBiayaTable() {
    const tbody = document.getElementById('body-operasional');
    if (!tbody) return;

    if (db.biaya.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data biaya.</td></tr>';
        return;
    }

    tbody.innerHTML = db.biaya.slice().reverse().map(b => `
        <tr>
            <td>${b.tanggal}</td>
            <td>${b.nama}</td>
            <td>${formatIDR(b.jumlah)}</td>
            <td>
                <button class="btn-danger" onclick="hapusBiaya(${b.id})" style="padding:4px; border-radius:4px;">
                    <span class="material-icons-sharp" style="font-size:18px;">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
}

function hapusBiaya(id) {
    if (confirm("Hapus biaya ini?")) {
        db.biaya = db.biaya.filter(b => b.id !== id);
        saveData();
        renderBiayaTable();
        updateDashboard();
    }
}


function editHarga(id) {
    const item = db.stok.find(p => p.id === id);
    if (!item) return;

    // Menampilkan dialog input untuk harga modal dan jual
    const modalBaru = prompt(`Edit Harga MODAL untuk ${item.nama}:`, item.modal);
    if (modalBaru === null) return; // Jika user menekan Cancel

    const jualBaru = prompt(`Edit Harga JUAL untuk ${item.nama}:`, item.jual);
    if (jualBaru === null) return; // Jika user menekan Cancel

    // Konversi ke angka
    const modalNum = parseInt(modalBaru);
    const jualNum = parseInt(jualBaru);

    // Validasi sederhana
    if (isNaN(modalNum) || isNaN(jualNum)) {
        alert("Input harus berupa angka!");
        return;
    }

    // Update data di database
    item.modal = modalNum;
    item.jual = jualNum;

    // Simpan perubahan dan refresh tampilan
    saveData();
    renderStokTable();
    updateDashboard(); // Sangat penting: agar "Laba Potensial" di dashboard ikut berubah
    alert(`Harga ${item.nama} berhasil diperbarui!`);
}

function resetFilter() { document.getElementById('filter-tanggal').value = ''; renderLaporan(); }

// --- LOGIKA BACKUP & EKSPOR ---

// 1. Download database ke file JSON
function backupData() {
    try {
        const dataStr = JSON.stringify(db, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `KasirPro_Backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Gagal melakukan backup data.");
    }
}

// 2. Restore data dari file JSON ke LocalStorage
function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDb = JSON.parse(e.target.result);
            // Validasi sederhana struktur data
            if (importedDb.stok && importedDb.transaksi && importedDb.biaya) {
                if (confirm("Perhatian! Seluruh data saat ini akan diganti. Lanjutkan?")) {
                    db = importedDb;
                    saveData();
                    alert("Data berhasil dipulihkan!");
                    location.reload();
                }
            } else {
                alert("File backup tidak valid (struktur data salah).");
            }
        } catch (err) {
            alert("Error: File bukan format JSON yang benar.");
        }
    };
    reader.readAsText(file);
}

// 3. Ekspor Riwayat Transaksi ke Excel (Format CSV)
function eksporLaporanCSV() {
    if (db.transaksi.length === 0) {
        alert("Belum ada data transaksi untuk diekspor.");
        return;
    }

    let csv = "ID Transaksi,Tanggal,Nama Produk,Qty,Total Bayar,Laba\n";
    
    db.transaksi.forEach(t => {
        csv += `${t.id},${t.tanggal},"${t.produk}",${t.qty},${t.total},${t.laba}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Penjualan_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// FUNGSI PENCARIAN STOK
function cariStok() {
    const keyword = document.getElementById('search-stok').value.toLowerCase();
    const rows = document.querySelectorAll('#table-stok tbody tr');

    rows.forEach(row => {
        // Mengambil teks dari kolom pertama (Nama Barang)
        const namaBarang = row.querySelector('td:first-child').innerText.toLowerCase();
        if (namaBarang.includes(keyword)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// FUNGSI PENCARIAN DI KASIR
function filterProdukKasir() {
    const keyword = document.getElementById('search-kasir').value.toLowerCase();
    const select = document.getElementById('kasir-pilih-produk');
    const options = select.options;

    for (let i = 0; i < options.length; i++) {
        const text = options[i].text.toLowerCase();
        if (i === 0) continue; // Jangan sembunyikan tulisan "-- Pilih Barang --"
        
        if (text.includes(keyword)) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
}

// Fungsi menghitung kembalian secara realtime
function hitungKembalian() {
    const totalTagihan = keranjangSementera.reduce((acc, item) => acc + item.subtotal, 0);
    const nominalBayar = parseInt(document.getElementById('bayar-nominal').value) || 0;
    const kembalian = nominalBayar - totalTagihan;

    const display = document.getElementById('kembalian-display');
    display.innerText = formatIDR(kembalian < 0 ? 0 : kembalian);
    
    if (kembalian < 0) {
        display.style.color = 'var(--d-color)'; // Merah jika uang kurang
    } else {
        display.style.color = 'var(--s-color)'; // Hijau jika cukup/lebih
    }
}

// Update fungsi simpanTransaksi untuk menyertakan fitur cetak
function simpanTransaksi() {
    if (keranjangSementera.length === 0) return alert("Keranjang masih kosong!");
    
    const totalTagihan = keranjangSementera.reduce((acc, item) => acc + item.subtotal, 0);
    const nominalBayar = parseInt(document.getElementById('bayar-nominal').value) || 0;

    if (nominalBayar < totalTagihan) {
        alert("Uang pembayaran kurang!");
        return;
    }

    // 1. Simpan ke Database (seperti fungsi Anda sebelumnya)
    const idTransaksi = Date.now();
    keranjangSementera.forEach(item => {
        db.transaksi.push({
            id: idTransaksi,
            tanggal: new Date().toLocaleDateString('id-ID'),
            produk: item.nama,
            qty: item.qty,
            total: item.subtotal,
            laba: item.subtotal - (item.hargaModal * item.qty)
        });

        // Potong Stok
        const produkStok = db.stok.find(s => s.id === item.id);
        if (produkStok) produkStok.jumlah -= item.qty;
    });

    saveData();
    
    // 2. Trigger Cetak Struk
    window.print(); // Browser akan mencetak area yang tidak memiliki class "no-print"

    // 3. Reset
    keranjangSementera = [];
    document.getElementById('bayar-nominal').value = '';
    renderKeranjang();
    updateDashboard();
    alert("Transaksi Berhasil Disimpan!");
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
}

// Cek tema saat load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

let html5QrCode;

function startScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Cari produk berdasarkan kode barcode
        const produk = db.stok.find(p => p.kode === decodedText);
        
        if (produk) {
            // Jika ketemu, otomatis masukkan ke kasir (panggil fungsi tambah keranjangmu)
            document.getElementById('pilih-produk').value = produk.id;
            alert("Produk Terdeteksi: " + produk.nama);
            html5QrCode.stop(); // Berhenti setelah ketemu
        } else {
            alert("Barcode tidak terdaftar: " + decodedText);
        }
    };
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
}

// --- INITIALIZATION (SATU FUNGSI SAJA) ---
window.onload = () => {
    // Inisialisasi Tanggal
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }

    // Load semua komponen
    updateDashboard();
    renderStokTable();
    renderBiayaTable();
    updateNotifications();
};

// Pastikan hanya ada satu fungsi saveData
function saveData() {
    localStorage.setItem('kasir_pro_db', JSON.stringify(db));
}