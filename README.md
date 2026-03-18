# IoTzy v2 — Smart Room Dashboard (PHP + MySQL)

## Stack
- **Backend**: PHP 8.x + PDO + MySQL/MariaDB
- **Frontend**: Pure HTML/CSS/JS (no framework needed)
- **MQTT**: Eclipse Paho JS (WebSocket)
- **CV**: TensorFlow.js + COCO-SSD
- **Auth**: Session-based with bcrypt passwords

## File Structure
```
iotzy/
├── index.php              # Main dashboard (requires login)
├── login.php              # Login + Register page
├── logout.php             # Logout handler
├── database.sql           # Database schema + seed data
├── includes/
│   ├── config.php         # DB config & connection
│   └── auth.php           # Auth functions + DB helpers
├── api/
│   └── handler.php        # REST API endpoint (JSON)
└── assets/
    ├── css/
    │   └── dashboard.css
    └── js/
        ├── cv-config.js
        ├── cv-detector.js
        ├── light-analyzer.js
        ├── automation-engine.js
        ├── cv-ui.js
        └── app.js
```

## Setup

### 1. Database
```sql
-- Run database.sql in your MySQL client:
mysql -u root -p < database.sql
```

### 2. Configure DB Connection
Edit `includes/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'iotzy_db');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('APP_URL', 'http://localhost/iotzy');
define('APP_SECRET', 'your_random_32_char_secret_key_here');
```

### 3. Web Server
Place the `iotzy/` folder in your web root:
- **XAMPP**: `C:/xampp/htdocs/iotzy/`
- **LAMP**: `/var/www/html/iotzy/`
- **WAMP**: `C:/wamp64/www/iotzy/`

Then visit: `http://localhost/iotzy/login.php`

### 4. Default Credentials
| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | Admin@123 |
| User  | demo     | User@123  |

## Features
- ✅ Multi-user with role-based access (admin/user)
- ✅ Session-based authentication with bcrypt
- ✅ Per-user devices, sensors, MQTT settings
- ✅ MQTT WebSocket connection (HiveMQ public broker by default)
- ✅ Computer Vision (COCO-SSD human detection)
- ✅ Light brightness analysis via camera
- ✅ Automation rules (brightness/temp/presence)
- ✅ Activity logs stored in MySQL + export to Excel
- ✅ Dark/light theme (persisted per user)
- ✅ Profile & password management
- ✅ Pure B&W design aesthetic

## Requirements
- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.4+
- PHP extensions: PDO, PDO_MySQL, session
- Modern browser (Chrome, Firefox, Edge)
- HTTPS recommended for camera access in production
