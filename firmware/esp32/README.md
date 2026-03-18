# 📡 ESP32 IoTzy — Kode Arduino untuk TAv2

## 📋 Deskripsi

Sketch Arduino IDE untuk ESP32 yang terhubung ke **TAv2 Dashboard** via MQTT.

## 🔌 Wiring / Pin

| Komponen | GPIO | Keterangan |
|----------|------|------------|
| LED | 26 | Digital ON/OFF |
| Servo | 25 | Sweep 0°–180° |
| Fan (Kipas) | 32 | PWM speed control |
| DHT22 | 23 | Sensor suhu & kelembaban |

## 📦 Library yang Dibutuhkan

Install via **Arduino IDE → Library Manager**:
1. `PubSubClient` by Nick O'Leary
2. `DHT sensor library` by Adafruit
3. `ESP32Servo` by Kevin Harrington

## ⚙️ Cara Setup

### 1. Edit WiFi & Broker
Buka `ESP32_IoTzy.ino` lalu ubah:
```cpp
const char* ssid     = "WIFI_SSID_KAMU";
const char* password = "WIFI_PASSWORD_KAMU";
const char* mqtt_server = "broker.emqx.io";  // Samakan dengan TAv2
```

### 2. Samakan Topic dengan TAv2 Dashboard
Di file `.ino`:
```cpp
const char* topic_led   = "iotzy/led";
const char* topic_servo = "iotzy/servo";
const char* topic_fan   = "iotzy/fan";
const char* topic_temp  = "iotzy/dht/temp";
const char* topic_hum   = "iotzy/dht/hum";
```

Di **TAv2 Dashboard**, setting device & sensor:

| TAv2 Item | Topic Sub | Topic Pub |
|-----------|-----------|-----------|
| LED | `iotzy/led` | `iotzy/led` |
| Servo | `iotzy/servo` | `iotzy/servo` |
| Kipas | `iotzy/fan` | `iotzy/fan` |

| TAv2 Sensor | Topic |
|-------------|-------|
| Suhu | `iotzy/dht/temp` |
| Kelembaban | `iotzy/dht/hum` |

### 3. Setting MQTT Broker di TAv2
Pastikan di **Settings → MQTT Config** TAv2, broker-nya sama:
- **Broker**: `broker.emqx.io`
- **Port**: `8084` (WebSocket Secure)
- **Path**: `/mqtt`
- **Use SSL**: ✅

> ESP32 pakai port `1883` (TCP), TAv2 web pakai port `8084` (WSS).
> Keduanya tetap bisa berkomunikasi karena menuju broker yang sama.

## 📡 Format Payload MQTT

### Perintah dari Dashboard → ESP32
```json
// LED ON/OFF
{"state": 1}
{"state": 0}

// Servo ON + speed
{"state": 1, "speed": 75}

// Fan ON + speed
{"state": 1, "speed": 50}
{"state": 0}
```

### Data Sensor ESP32 → Dashboard
```json
// Suhu
{"value": 28.50}

// Kelembaban
{"value": 65.30}
```

## 🚀 Upload
1. Pilih **Board**: `ESP32 Dev Module`
2. Pilih **Port** yang sesuai
3. Klik **Upload**
4. Buka **Serial Monitor** (115200 baud) untuk monitoring
