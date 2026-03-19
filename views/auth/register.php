<?php
// Safety fallback
$error = $error ?? null;
$csrf  = $csrf ?? '';
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>IoTzy — Register</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>
:root{
--a:#22d3ee;--a-h:#06b6d4;--a-700:#0e7490;
--ink:#f1f5f9;--ink-4:#94a3b8;--ink-5:#64748b;
--border:rgba(56,189,248,.12);--surface:rgba(15,23,42,.7);
--green:#34d399;--green-bg:rgba(52,211,153,.1);
--red:#f87171;--red-bg:rgba(248,113,113,.1);
--shadow-lg:0 8px 40px rgba(0,0,0,.4);
--r:12px;--r-2xl:28px;
--font:'Plus Jakarta Sans',system-ui,sans-serif;
--t:200ms ease;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased}
body{
font-family:var(--font);
min-height:100vh;
background:#0a0e1a;
display:flex;
align-items:center;
justify-content:center;
padding:20px;
position:relative;
overflow:hidden;
}

.wrap{width:100%;max-width:400px;position:relative;z-index:1;}

.header{text-align:center;margin-bottom:28px;}

.logo{
width:68px;height:68px;border-radius:20px;
background:linear-gradient(135deg,var(--a),var(--a-h));
color:#fff;font-size:28px;
display:inline-flex;align-items:center;justify-content:center;
box-shadow:0 8px 32px rgba(6,182,212,.5);
margin-bottom:14px;
}

.title{font-size:28px;font-weight:800;color:var(--ink);letter-spacing:-.5px;}
.sub{font-size:13px;color:var(--ink-5);margin-top:4px;}

.card{
background:var(--surface);
border:1px solid var(--border);
border-radius:var(--r-2xl);
padding:28px 28px 24px;
box-shadow:var(--shadow-lg);
backdrop-filter:blur(20px);
}

.form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}

.form-label{
font-size:11px;font-weight:700;
color:var(--ink-5);
text-transform:uppercase;
letter-spacing:.5px;
}

.input-wrap{position:relative;}

.input-icon{
position:absolute;
left:12px;
top:50%;
transform:translateY(-50%);
color:var(--ink-5);
font-size:13px;
}

.form-input{
width:100%;
padding:11px 12px 11px 38px;
border:1.5px solid var(--border);
border-radius:var(--r);
font-size:13.5px;
color:var(--ink);
background:rgba(255,255,255,.04);
outline:none;
}

.form-input:focus{
border-color:var(--a-h);
box-shadow:0 0 0 3px rgba(6,182,212,.15);
}

.btn{
width:100%;
padding:12px 16px;
background:linear-gradient(135deg,var(--a-h),var(--a-700));
color:#fff;
font-size:14px;
font-weight:700;
border:none;
border-radius:var(--r);
cursor:pointer;
display:flex;
align-items:center;
justify-content:center;
gap:8px;
margin-top:4px;
}

.alert{
display:flex;
align-items:flex-start;
gap:9px;
padding:11px 14px;
border-radius:var(--r);
font-size:12.5px;
margin-bottom:16px;
}

.alert.error{
background:var(--red-bg);
color:var(--red);
border:1px solid rgba(248,113,113,.2);
}

.alert.success{
background:var(--green-bg);
color:var(--green);
border:1px solid rgba(52,211,153,.2);
}

.bottom-link{
text-align:center;
font-size:12.5px;
color:var(--ink-5);
margin-top:18px;
}

.bottom-link a{
color:var(--a);
font-weight:700;
text-decoration:none;
}

.footer{
text-align:center;
margin-top:16px;
font-size:11.5px;
color:var(--ink-5);
}
</style>

</head>
<body>

<div class="wrap">

<div class="header">
<div class="logo"><i class="fas fa-user-plus"></i></div>
<h1 class="title">IoTzy</h1>
<p class="sub">Daftar Akun Baru</p>
</div>

<div class="card">

<?php if (!empty($error)): ?>
<div class="alert error">
<i class="fas fa-circle-exclamation"></i>
<?= htmlspecialchars($error) ?>
</div>
<?php endif; ?>

<form method="POST">

<input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf) ?>">
<input type="hidden" name="action" value="register">

<div class="form-group">
<label class="form-label">Nama Lengkap</label>
<div class="input-wrap">
<i class="fas fa-id-card input-icon"></i>
<input type="text"
name="fullname"
class="form-input"
placeholder="Masukkan nama lengkap"
value="<?= htmlspecialchars($_POST['fullname'] ?? '') ?>"
required>
</div>
</div>

<div class="form-group">
<label class="form-label">Username</label>
<div class="input-wrap">
<i class="fas fa-user input-icon"></i>
<input type="text"
name="username"
class="form-input"
placeholder="Pilih username"
value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
required>
</div>
</div>

<div class="form-group">
<label class="form-label">Email</label>
<div class="input-wrap">
<i class="fas fa-envelope input-icon"></i>
<input type="email"
name="email"
class="form-input"
placeholder="alamat@email.com"
value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
required>
</div>
</div>

<div class="form-group">
<label class="form-label">Password</label>
<div class="input-wrap">
<i class="fas fa-lock input-icon"></i>
<input type="password"
name="password"
class="form-input"
placeholder="••••••••"
required>
</div>
</div>

<button type="submit" name="register_submit" class="btn">
<i class="fas fa-user-check"></i>
Buat Akun
</button>

</form>

<div class="bottom-link">
Sudah punya akun?
<a href="<?= APP_URL ?>/?route=login">Login di sini</a>
</div>

</div>

<div class="footer">
IoTzy By Rendy Aulia Nur
</div>

</div>

<script>
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    const formData = new FormData(e.target);
    try {
        const res = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Response text:', text);
            alert('Kesalahan Server (Bukan JSON). Cek konsol browser.');
            btn.disabled = false;
            btn.innerHTML = oldHtml;
            return;
        }

        if (data.success) {
            window.location.href = data.redirect || '<?= APP_URL ?>/?route=login&registered=1';
        } else {
            alert(data.error || 'Pendaftaran gagal.');
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    } catch (err) {
        console.error('Fetch error:', err);
        alert('Kesalahan Koneksi Jaringan.');
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
});
</script>
</body>
</html>
