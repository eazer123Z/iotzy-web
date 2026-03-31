<?php
require_once __DIR__ . '/../core/AIParser.php';
require_once __DIR__ . '/../controllers/AIChatController.php';

$fails = [];

$expect = function (bool $cond, string $msg) use (&$fails): void {
    if (!$cond) {
        $fails[] = $msg;
    }
};

$expect(iotzy_validate_builtin_automation_column('lamp') === 'automation_lamp', 'lamp whitelist failed');
$expect(iotzy_validate_builtin_automation_column('fan') === 'automation_fan', 'fan whitelist failed');
$expect(iotzy_validate_builtin_automation_column('lock') === 'automation_lock', 'lock whitelist failed');
$expect(iotzy_validate_builtin_automation_column('x, automation_lamp=1') === null, 'invalid whitelist should fail');

$cv = iotzyCanonicalCvState([
    'active' => true,
    'modelLoaded' => 1,
    'personCount' => 999,
    'brightness' => -20,
    'lightCondition' => '<script>alert(1)</script>'
]);
$expect($cv['is_active'] === 1, 'cv is_active cast failed');
$expect($cv['model_loaded'] === 1, 'cv model_loaded cast failed');
$expect($cv['person_count'] === 20, 'cv person_count clamp failed');
$expect($cv['brightness'] === 0, 'cv brightness clamp failed');
$expect($cv['light_condition'] === 'unknown', 'cv light_condition validation failed');

$_SESSION['csrf_token'] = 'unit-test-token';
$sum1 = iotzyCvStateChecksum($cv);
$sum2 = iotzyCvStateChecksum($cv);
$expect(strlen($sum1) === 8, 'checksum length invalid');
$expect($sum1 === $sum2, 'checksum must be deterministic');

$long = str_repeat('A', AI_CONTEXT_MAX_CHARS + 3000);
$trimmed = iotzy_trim_context_for_prompt($long, 'status perangkat');
$expect(strlen($trimmed) <= AI_CONTEXT_MAX_CHARS, 'context trimming exceeded limit');

$msg = iotzyValidateMessage(str_repeat('b', AI_CHAT_MAX_MESSAGE_LEN + 150));
$expect(mb_strlen($msg) === AI_CHAT_MAX_MESSAGE_LEN, 'message length validation failed');

if ($fails) {
    foreach ($fails as $f) {
        echo "[FAIL] {$f}\n";
    }
    exit(1);
}
echo "security_regression_test: OK\n";
