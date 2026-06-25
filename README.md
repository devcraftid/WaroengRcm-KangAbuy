<div align="center">
  <img src="public/logo.png" width="150" alt="Logo Waroeng RCM" />
  <h1>Waroeng RCM - Menu Digital & POS Berbasis QR Code</h1>

  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
</div>

<br />

**Repositori ini merupakan bagian dari pemenuhan Tugas Kerja Praktek (KP).**

> **Judul Kerja Praktek:**
> *"Perancangan Website Menu Digital Berbasis QR Code untuk Sistem Pemesanan pada UMKM Kedai Warung Kang Abuy"*

## Tim Pengembang (Mahasiswa KP)
Proyek ini dirancang dan dikembangkan oleh:
| Nama | NIM |
| :--- | :--- |
| **Fadel** | 231011402972 |
| **Yuma** | 231011400656 |
| **Tias** | 231011400593 |

---

## Tentang Proyek
Sistem Informasi **Waroeng RCM** adalah sebuah aplikasi web yang mengintegrasikan Menu Digital Mandiri (Self-Service) melalui _Scan QR Code_ dengan Sistem Kasir Digital (Point of Sales). Aplikasi ini secara khusus dibangun untuk mendigitalisasi proses bisnis di UMKM Kedai Warung Kang Abuy.

Dengan sistem ini, pelanggan tidak perlu lagi antre atau memanggil pelayan untuk memesan. Cukup dengan melakukan _scan QR Code_ yang ada di meja masing-masing menggunakan kamera smartphone, pelanggan dapat langsung melihat menu, memesan, hingga melacak status pesanannya. Seluruh pesanan akan langsung masuk ke layar Kasir/Admin secara Real-Time.

## Fitur Unggulan

### Sisi Pelanggan (Customer)
- **Scan QR Code & Menu Digital:** Pemesanan instan langsung dari meja tanpa instalasi aplikasi.
- **Keranjang Cerdas:** Perhitungan subtotal otomatis untuk makan di tempat (Dine-in) atau bawa pulang (Takeaway).
- **Pembayaran Fleksibel:** Mendukung metode pembayaran Tunai maupun Cashless (QRIS) dengan fitur upload bukti transfer.
- **Live Order Tracking:** Pelacakan pesanan secara langsung (Menunggu Validasi -> Sedang Dimasak -> Selesai).

### Sisi Admin / Kasir (Back-Office)
- **Notifikasi Real-Time (WebSockets):** Pesanan baru dari meja pelanggan akan langsung muncul disertai bunyi notifikasi secara otomatis tanpa refresh halaman.
- **Validasi Pembayaran Interaktif:** Pengecekan bukti transfer dengan fitur pop-up detail gambar yang aman dari pemblokiran browser.
- **Manajemen Menu & Kategori:** Mengatur ketersediaan hidangan, harga, dan gambar dengan mudah.
- **Dashboard Analytics:** Visualisasi grafik pendapatan (Trend Penjualan), metrik performa pelayanan rata-rata, hingga daftar hidangan Paling Laris (Best Seller).
- **Cetak Struk Thermal:** Struk pesanan yang diformat khusus untuk dicetak langsung menggunakan printer kasir (Thermal Printer).

---

## Teknologi yang Digunakan (Tech Stack)
- **Frontend:** React.js, Vite
- **Styling:** Tailwind CSS, Framer Motion (Animasi UI)
- **Icons:** Lucide React
- **Backend & Database:** Supabase (PostgreSQL, Realtime Subscriptions, Storage)
- **State Management:** Zustand
- **Routing:** React Router DOM

---

## Panduan Instalasi (Cara Menjalankan Lokal)

Untuk menjalankan proyek ini di komputer lokal Anda, ikuti langkah-langkah berikut:

### 1. Clone Repositori
```bash
git clone https://github.com/devcraftid/WaroengRcm-KangAbuy.git
cd WaroengRcm-KangAbuy
```

### 2. Install Dependensi
Pastikan [Node.js](https://nodejs.org/) sudah terinstal di komputer Anda, lalu jalankan:
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file bernama `.env` di root folder proyek, lalu isi dengan konfigurasi Supabase Anda:
```env
VITE_SUPABASE_URL=URL_SUPABASE_ANDA
VITE_SUPABASE_ANON_KEY=KUNCI_ANON_SUPABASE_ANDA
```
*(Catatan: Mintalah kredensial ini kepada tim pengembang jika Anda bertindak sebagai peninjau/dosen).*

### 4. Jalankan Aplikasi (Development Server)
```bash
npm run dev
```
Aplikasi dapat diakses melalui browser pada `http://localhost:3000` (atau port lain yang tertera di terminal).

---

## Dokumentasi / Screenshot Tampilan

### Tampilan Menu Pelanggan
<a href="public/img/Screenshot/publik/Screenshot%20(96).png" target="_blank">
  <img src="public/img/Screenshot/publik/Screenshot (96).png" width="600" alt="Menu Pelanggan" />
</a>

### Tampilan Lacak Pesanan
<a href="public/img/Screenshot/publik/Screenshot%20(97).png" target="_blank">
  <img src="public/img/Screenshot/publik/Screenshot (97).png" width="600" alt="Lacak Pesanan" />
</a>

### Tampilan Login
<a href="public/img/Screenshot/admin/Screenshot%20(102).png" target="_blank">
  <img src="public/img/Screenshot/admin/Screenshot (102).png" width="600" alt="Login" />
</a>

### Tampilan Admin
<a href="public/img/Screenshot/admin/Screenshot%20(103).png" target="_blank">
  <img src="public/img/Screenshot/admin/Screenshot (103).png" width="600" alt="Tampilan Admin" />
</a>


---

<p align="center">
  Dibuat oleh Mahasiswa KP Universitas Pamulang<br>
  © 2026 Waroeng RCM
</p>