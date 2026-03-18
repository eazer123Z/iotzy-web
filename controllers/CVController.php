<?php
/**
 * controllers/CVController.php — Computer Vision Rules & Config
 */

require_once __DIR__ . '/../core/bootstrap.php';

function handleCVAction(string $action, int $userId, array $body, PDO $db): void {
    if ($action === 'get_cv_rules') {
        $stmt=$db->prepare("SELECT cv_rules FROM user_settings WHERE user_id=?"); $stmt->execute([$userId]);
        $row=$stmt->fetchColumn();
        $def=['human'=>['enabled'=>true,'onDetect'=>[],'onAbsent'=>[],'delay'=>5000],'light'=>['enabled'=>true,'onDark'=>[],'onBright'=>[],'delay'=>2000]];
        jsonOut($row?(json_decode($row,true)??$def):$def);
    }

    if ($action === 'save_cv_rules') {
        $rules=$body['rules']??null;
        if (!$rules||!is_array($rules)) jsonOut(['success'=>false,'error'=>'Data tidak valid']);
        dbWrite("UPDATE user_settings SET cv_rules=? WHERE user_id=?",[json_encode($rules),$userId]);
        jsonOut(['success'=>true]);
    }

    if ($action === 'get_cv_config') {
        $stmt=$db->prepare("SELECT cv_config FROM user_settings WHERE user_id=?"); $stmt->execute([$userId]);
        $row=$stmt->fetchColumn();
        $def=['showBoundingBox'=>true,'showDebugInfo'=>true,'minConfidence'=>0.6];
        jsonOut($row?(json_decode($row,true)??$def):$def);
    }

    if ($action === 'save_cv_config') {
        $config=$body['config']??null;
        if (!$config||!is_array($config)) jsonOut(['success'=>false,'error'=>'Data tidak valid']);
        $safe=['showBoundingBox'=>(bool)($config['showBoundingBox']??true),'showDebugInfo'=>(bool)($config['showDebugInfo']??true),'minConfidence'=>max(0.1,min(0.99,(float)($config['minConfidence']??0.6)))];
        dbWrite("UPDATE user_settings SET cv_config=? WHERE user_id=?",[json_encode($safe),$userId]);
        jsonOut(['success'=>true]);
    }
}
