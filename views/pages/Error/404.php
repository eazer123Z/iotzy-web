<?php
http_response_code(404);
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>IoTzy — 404</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
:root {
    --a:#22d3ee;--a-h:#06b6d4;
    --ink:#f1f5f9;--ink-4:#94a3b8;--ink-5:#64748b;
    --border:rgba(56,189,248,.12);--surface:rgba(15,23,42,.7);
    --shadow-lg:0 8px 40px rgba(0,0,0,.4);
    --r:12px;--r-2xl:28px;
    --font:'Plus Jakarta Sans',system-ui,sans-serif;
    --t:200ms ease;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased}
body{
    font-family:var(--font);min-height:100vh;
    background:#0a0e1a;color:var(--ink);
    display:flex;align-items:center;justify-content:center;
    padding:20px;position:relative;overflow:hidden;
    background-image:
      radial-gradient(ellipse 80% 60% at 10% 20%, rgba(6,182,212,.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 90% 80%, rgba(124,58,237,.06) 0%, transparent 60%);
}
body::before{content:'';position:fixed;top:-150px;right:-150px;width:450px;height:450px;border-radius:50%;background:radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 70%);pointer-events:none;animation:orbFloat 8s ease-in-out infinite;}
body::after{content:'';position:fixed;bottom:-100px;left:-100px;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.08) 0%,transparent 70%);pointer-events:none;animation:orbFloat 10s ease-in-out infinite reverse;}
@keyframes orbFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-20px)}}
.wrap{text-align:center;position:relative;z-index:1;max-width:440px;}
.error-code{
    font-size:120px;font-weight:800;letter-spacing:-4px;line-height:1;
    background:linear-gradient(135deg,var(--a),var(--a-h));
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;
    text-shadow:0 0 60px rgba(6,182,212,.3);
    margin-bottom:12px;
}
.error-title{font-size:22px;font-weight:700;margin-bottom:8px;}
.error-desc{font-size:14px;color:var(--ink-4);line-height:1.6;margin-bottom:28px;}
.btn{
    display:inline-flex;align-items:center;gap:8px;
    padding:12px 28px;border-radius:var(--r);
    background:linear-gradient(135deg,var(--a-h),#0e7490);
    color:#fff;font-size:14px;font-weight:700;
    text-decoration:none;font-family:var(--font);
    transition:all var(--t);
    box-shadow:0 2px 16px rgba(6,182,212,.35);
}
.btn:hover{background:linear-gradient(135deg,var(--a),var(--a-h));transform:translateY(-2px);box-shadow:0 4px 24px rgba(6,182,212,.45);}
.icon-wrap{
    width:80px;height:80px;border-radius:22px;margin:0 auto 20px;
    background:rgba(6,182,212,.1);border:1.5px solid rgba(6,182,212,.2);
    display:flex;align-items:center;justify-content:center;
    font-size:32px;color:var(--a);
    animation:iconFloat 3s ease-in-out infinite;
}
@keyframes iconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
</style>
</head>
<body>
<div class="wrap">
    <div class="icon-wrap"><i class="fas fa-satellite-dish"></i></div>
    <div class="error-code">404</div>
    <h1 class="error-title">Halaman Tidak Ditemukan</h1>
    <p class="error-desc">Sinyal hilang! Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
    <a href="<?= APP_URL ?>/" class="btn"><i class="fas fa-arrow-left"></i> Kembali ke Dashboard</a>
</div>
</body>
</html>
