<?php
/**
 * controllers/ProfileController.php — User Profile & Password
 */

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../services/UserDataService.php';

function handleProfileAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_user') {
        $u = getCurrentUserFresh();
        if ($u) jsonOut(['success'=>true,'user'=>['id'=>(int)$u['id'],'username'=>$u['username'],'email'=>$u['email'],'full_name'=>$u['full_name'],'role'=>$u['role'],'theme'=>$u['theme']]]);
        jsonOut(['success'=>false,'error'=>'User tidak ditemukan.']);
    }

    if ($action === 'update_profile') {
        $fn = trim($body['full_name'] ?? '');
        $e  = trim($body['email'] ?? '');
        if (!$e || !filter_var($e,FILTER_VALIDATE_EMAIL)) jsonOut(['success'=>false,'error'=>'Format email tidak valid']);
        $stmt = $db->prepare("SELECT id FROM users WHERE email=? AND id!=?");
        $stmt->execute([$e,$userId]);
        if ($stmt->fetch()) jsonOut(['success'=>false,'error'=>'Email sudah digunakan akun lain']);
        dbWrite("UPDATE users SET full_name=?,email=? WHERE id=?", [$fn?:null,$e,$userId]);
        jsonOut(['success'=>true,'message'=>'Profil berhasil diperbarui']);
    }

    if ($action === 'change_password') {
        $curr = $body['current_password'] ?? '';
        $new  = $body['new_password'] ?? '';
        if (!$curr || !$new || strlen($new)<8) jsonOut(['success'=>false,'error'=>'Password baru minimal 8 karakter']);
        $stmt = $db->prepare("SELECT password_hash FROM users WHERE id=?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($curr,$hash)) jsonOut(['success'=>false,'error'=>'Password lama tidak sesuai']);
        $newHash = password_hash($new,PASSWORD_BCRYPT,['cost'=>12]);
        dbWrite("UPDATE users SET password_hash=? WHERE id=?", [$newHash,$userId]);
        jsonOut(['success'=>true,'message'=>'Password berhasil diubah']);
    }
}
