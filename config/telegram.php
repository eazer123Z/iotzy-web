<?php
/**
 * config/telegram.php — External API Keys & Telegram Config
 *
 * ⚠️ SECURITY: Jangan commit file ini ke Git publik!
 *    Masukkan ke .gitignore untuk produksi.
 */

// OpenRouter AI API
define('OPENROUTER_API_KEY', getenv('OPENROUTER_API_KEY') ?: '');

// Telegram Bot
define('TELEGRAM_BOT_TOKEN', getenv('TELEGRAM_BOT_TOKEN') ?: '');
