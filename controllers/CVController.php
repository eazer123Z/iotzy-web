<?php
/**
 * controllers/CVController.php
 * ───
 * Menangani konfigurasi Computer Vision (CV) berbasis TensorFlow.js.
 * Mengelola aturan deteksi objek, ambang batas cahaya, dan statistik deteksi.
 */

require_once __DIR__ . '/../core/bootstrap.php';

function handleCVAction(string $action, int $userId, array $body, PDO $db): void {
    $defRules = ['human'=>['enabled'=>true,'onDetect'=>[],'onAbsent'=>[],'delay'=>5000],'light'=>['enabled'=>true,'onDark'=>[],'onBright'=>[],'delay'=>2000]];
    
    if ($action === 'get_cv_rules') {
        try {
            $stmt=$db->prepare("SELECT cv_rules FROM user_settings WHERE user_id=?"); 
            $stmt->execute([$userId]);
            $row=$stmt->fetchColumn();
            jsonOut($row?(json_decode($row,true)??$defRules):$defRules);
        } catch (\PDOException $e) {
            error_log('[CVController] get_cv_rules missing column fallback');
            jsonOut($defRules); // Fallback jika kolom belum dibuat
        }
    }

    if ($action === 'save_cv_rules') {
        $rules=$body['rules']??null;
        if (!$rules||!is_array($rules)) jsonOut(['success'=>false,'error'=>'Data tidak valid']);
        try {
            dbWrite("UPDATE user_settings SET cv_rules=? WHERE user_id=?",[json_encode($rules),$userId]);
            jsonOut(['success'=>true]);
        } catch (\PDOException $e) {
            jsonOut(['success'=>false,'error'=>'Tabel DB perlu diupdate. Jalankan script Vercel db-init.php']);
        }
    }

    if ($action === 'get_cv_config') {
        $defConfig = [
            'showBoundingBox' => true, 
            'showDebugInfo' => true, 
            'minConfidence' => 0.6,
            'darkThreshold' => 0.3,
            'brightThreshold' => 0.7,
            'humanEnabled' => true,
            'lightEnabled' => true
        ];
        try {
            $stmt=$db->prepare("SELECT cv_config, cv_min_confidence, cv_dark_threshold, cv_bright_threshold, cv_human_rules_enabled, cv_light_rules_enabled FROM user_settings WHERE user_id=?"); 
            $stmt->execute([$userId]);
            $row=$stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $defConfig['minConfidence'] = (float)($row['cv_min_confidence'] ?? 0.6);
                $defConfig['darkThreshold'] = (float)($row['cv_dark_threshold'] ?? 0.3);
                $defConfig['brightThreshold'] = (float)($row['cv_bright_threshold'] ?? 0.7);
                $defConfig['humanEnabled'] = (bool)($row['cv_human_rules_enabled'] ?? true);
                $defConfig['lightEnabled'] = (bool)($row['cv_light_rules_enabled'] ?? true);
            }
        } catch (\PDOException $e) {
            error_log('[CVController] get_cv_config missing column fallback');
        }
        jsonOut($defConfig);
    }

    if ($action === 'save_cv_config') {
        $config=$body['config']??null;
        if (!$config||!is_array($config)) jsonOut(['success'=>false,'error'=>'Data tidak valid']);
        
        $hasMin     = array_key_exists('minConfidence', $config);
        $hasDark    = array_key_exists('darkThreshold', $config);
        $hasBright  = array_key_exists('brightThreshold', $config);
        $hasHuman   = array_key_exists('humanEnabled', $config);
        $hasLight   = array_key_exists('lightEnabled', $config);

        $minConfidence = $hasMin ? max(0.1, min(0.99, (float)($config['minConfidence'] ?? 0.6))) : null;
        $darkThreshold = $hasDark ? max(0.01, min(0.99, (float)($config['darkThreshold'] ?? 0.3))) : null;
        $brightThreshold = $hasBright ? max(0.01, min(0.99, (float)($config['brightThreshold'] ?? 0.7))) : null;
        $humanEnabled = $hasHuman ? (int)($config['humanEnabled'] ?? 1) : null;
        $lightEnabled = $hasLight ? (int)($config['lightEnabled'] ?? 1) : null;

        $sql = "UPDATE user_settings SET
                cv_min_confidence = COALESCE(?, cv_min_confidence),
                cv_dark_threshold = COALESCE(?, cv_dark_threshold),
                cv_bright_threshold = COALESCE(?, cv_bright_threshold),
                cv_human_rules_enabled = COALESCE(?, cv_human_rules_enabled),
                cv_light_rules_enabled = COALESCE(?, cv_light_rules_enabled)
                WHERE user_id = ?";
        
        try {
            dbWrite($sql, [
                $minConfidence,
                $darkThreshold,
                $brightThreshold,
                $humanEnabled,
                $lightEnabled,
                $userId
            ]);
            jsonOut(['success'=>true]);
        } catch (\PDOException $e) {
            jsonOut(['success'=>false,'error'=>'Kolom DB gagal disimpan. Harap jalankan script init DB.']);
        }
    }
}
