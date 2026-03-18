#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ESP32Servo.h>

/* ================= WIFI ================= */

const char* ssid     = "WIFI_SSID_KAMU";
const char* password = "WIFI_PASSWORD_KAMU";

/* ================= MQTT ================= */

const char* mqtt_server   = "broker.emqx.io";
const int   mqtt_port     = 1883;
const char* mqtt_clientId = "ESP32_IoTzy";

WiFiClient espClient;
PubSubClient client(espClient);

/* ================= PIN ================= */

#define LED_PIN 26
#define SERVO_PIN 25
#define DHT_PIN 23
#define FAN_PIN 32

#define DHTTYPE DHT22

/* ================= FAN PWM ================= */

const int FAN_FREQ = 1000;
const int FAN_RES  = 8;

/* ================= OBJECT ================= */

Servo myServo;
DHT dht(DHT_PIN, DHTTYPE);

/* ================= MQTT TOPIC ================= */

const char* topic_led   = "iotzy/led";
const char* topic_servo = "iotzy/servo";
const char* topic_fan   = "iotzy/fan";

const char* topic_temp  = "iotzy/dht/temp";
const char* topic_hum   = "iotzy/dht/hum";

/* ================= TIMER ================= */

unsigned long lastDHT = 0;
const int dhtInterval = 2000;

/* ================= DEVICE STATE ================= */

bool ledState = false;

/* SERVO DOOR */

bool servoOpen = false;
int servoPos = 0;

const int SERVO_OPEN_POS  = 90;
const int SERVO_CLOSE_POS = 0;

/* FAN */

int fanSpeed = 0;

/* ================= SENSOR ================= */

float currentTemp = 0;
float currentHum  = 0;

/* ================= FAN CONTROL ================= */

void setFanSpeed(int percent){

  percent = constrain(percent,0,100);

  int pwm = map(percent,0,100,0,255);

  // supaya fan tidak macet
  if(percent > 0 && pwm < 80){
    pwm = 80;
  }

  ledcWrite(FAN_PIN, pwm);

  fanSpeed = pwm;
}

/* ================= DEVICE STATUS ================= */

void printDeviceStatus() {

  Serial.println();
  Serial.println("========================================");
  Serial.println("DEVICE STATUS");
  Serial.println("----------------------------------------");

  Serial.print("LED        : ");
  Serial.println(ledState ? "ON" : "OFF");

  Serial.print("SERVO      : ");
  Serial.println(servoOpen ? "OPEN" : "CLOSED");

  Serial.print("SERVO POS  : ");
  Serial.println(servoPos);

  Serial.print("FAN SPEED  : ");
  Serial.print(map(fanSpeed,0,255,0,100));
  Serial.println(" %");

  Serial.print("TEMP       : ");
  Serial.print(currentTemp);
  Serial.println(" C");

  Serial.print("HUMIDITY   : ");
  Serial.print(currentHum);
  Serial.println(" %");

  Serial.println("========================================");
}

/* ================= WIFI ================= */

void setup_wifi() {

  Serial.print("Connecting WiFi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("IP : ");
  Serial.println(WiFi.localIP());
}

/* ================= JSON PARSER ================= */

int getJsonInt(String json, String key) {

  String search = "\"" + key + "\":";
  int idx = json.indexOf(search);

  if (idx < 0) return -999;

  String val = json.substring(idx + search.length());
  val.trim();

  return val.toInt();
}

/* ================= MQTT CALLBACK ================= */

void callback(char* topic, byte* payload, unsigned int length) {

  String message;

  for (int i=0;i<length;i++) {
    message += (char)payload[i];
  }

  /* LED */

  if (String(topic) == topic_led) {

    int state = getJsonInt(message,"state");

    if(state==1){
      digitalWrite(LED_PIN,HIGH);
      ledState=true;
    }
    else if(state==0){
      digitalWrite(LED_PIN,LOW);
      ledState=false;
    }
  }

  /* SERVO */

  if (String(topic) == topic_servo) {

    int state = getJsonInt(message,"state");

    if(state==1){

      servoOpen=true;
      servoPos=SERVO_OPEN_POS;
      myServo.write(servoPos);

      Serial.println("SERVO DOOR OPEN");

    }

    else if(state==0){

      servoOpen=false;
      servoPos=SERVO_CLOSE_POS;
      myServo.write(servoPos);

      Serial.println("SERVO DOOR CLOSED");

    }
  }

  /* FAN */

  if (String(topic) == topic_fan) {

    int state = getJsonInt(message,"state");
    int speed = getJsonInt(message,"speed");

    if(state==0){

      setFanSpeed(0);

    }else{

      if(speed!=-999){
        setFanSpeed(speed);
      }else{
        setFanSpeed(100);
      }

    }
  }

  printDeviceStatus();
}

/* ================= MQTT ================= */

void reconnect() {

  while (!client.connected()) {

    Serial.println("MQTT Connecting...");

    if (client.connect(mqtt_clientId)) {

      Serial.println("MQTT Connected");

      client.subscribe(topic_led);
      client.subscribe(topic_servo);
      client.subscribe(topic_fan);

    } else {

      Serial.println("Retry MQTT...");
      delay(3000);

    }
  }
}

/* ================= SETUP ================= */

void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN,OUTPUT);
  digitalWrite(LED_PIN,LOW);

  myServo.attach(SERVO_PIN);
  myServo.write(SERVO_CLOSE_POS);

  /* FAN PWM */

  ledcAttach(FAN_PIN, FAN_FREQ, FAN_RES);

  dht.begin();

  setup_wifi();

  client.setServer(mqtt_server,mqtt_port);
  client.setCallback(callback);
}

/* ================= LOOP ================= */

void loop() {

  if (WiFi.status()!=WL_CONNECTED) setup_wifi();

  if (!client.connected()) reconnect();

  client.loop();

  /* SENSOR */

  if (millis()-lastDHT>dhtInterval){

    lastDHT=millis();

    float temp=dht.readTemperature();
    float hum=dht.readHumidity();

    if(!isnan(temp) && !isnan(hum)){

      currentTemp=temp;
      currentHum=hum;

      String payloadTemp="{\"value\":"+String(temp,2)+"}";
      String payloadHum ="{\"value\":"+String(hum,2)+"}";

      client.publish(topic_temp,payloadTemp.c_str());
      client.publish(topic_hum,payloadHum.c_str());

      printDeviceStatus();
    }
  }
}