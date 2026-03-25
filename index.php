<?php
/**
 * index.php — Root Wrapper
 * ───
 * Vercel mewajibkan Serverless function berada di dalam direktori `api/`.
 * File ini meneruskan execute context ke api/index.php.
 */

require __DIR__ . '/api/index.php';
