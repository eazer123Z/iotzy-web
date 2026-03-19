<?php
/**
 * api/index.php — PRODUCTION BRIDGE (Final Sync)
 * 
 * Melayani request Vercel dan meneruskannya ke index.php utama.
 */

// Aktifkan error logging ke stderr (Vercel Logs)
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require __DIR__ . '/../index.php';
