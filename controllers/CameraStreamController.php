<?php

require_once __DIR__ . '/../core/bootstrap.php';
require_once __DIR__ . '/../core/UserDataService.php';

function handleCameraStreamAction(string $action, int $userId, array $body, PDO $db): void
{
    $featureStatus = iotzyCameraStreamFeatureStatus($db);

    if ($action === 'get_camera_stream_sessions') {
        jsonOut([
            'success' => true,
            'feature_ready' => $featureStatus['feature_ready'],
            'sessions' => $featureStatus['feature_ready']
                ? getUserCameraStreamSessions($userId, $body, $db)
                : [],
            'error' => $featureStatus['error'],
        ]);
    }

    requireCsrf();

    if ($action === 'start_camera_stream') {
        $result = startUserCameraStreamSession($userId, $body, $body, $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }

    if ($action === 'join_camera_stream') {
        $streamKey = trim((string)($body['stream_key'] ?? ''));
        $result = joinUserCameraStreamSession($userId, $body, $streamKey, $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }

    if ($action === 'submit_camera_stream_answer') {
        $streamKey = trim((string)($body['stream_key'] ?? ''));
        $result = submitUserCameraStreamAnswer($userId, $body, $streamKey, $body['answer_sdp'] ?? '', $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }

    if ($action === 'push_camera_stream_candidate') {
        $streamKey = trim((string)($body['stream_key'] ?? ''));
        $result = pushUserCameraStreamCandidate($userId, $body, $streamKey, $body['candidate'] ?? null, $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }

    if ($action === 'poll_camera_stream_updates') {
        $streamKey = trim((string)($body['stream_key'] ?? ''));
        $lastCandidateId = max(0, (int)($body['last_candidate_id'] ?? 0));
        $result = pollUserCameraStreamUpdates($userId, $body, $streamKey, $lastCandidateId, $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }

    if ($action === 'stop_camera_stream') {
        $streamKey = trim((string)($body['stream_key'] ?? ''));
        $result = stopUserCameraStreamSession($userId, $body, $streamKey, $db);
        jsonOut($result, !empty($result['success']) ? 200 : 400);
    }
}
