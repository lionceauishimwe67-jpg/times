#include <WiFi.h>
#include <HTTPClient.h>
#include <EEPROM.h>
#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <time.h>

const char* ssid = "123456";
const char* password = "muhura@123";
const char* backendUrl = "http://192.168.0.230:5000"; // Change this to your backend IP/port
const char* scheduleEndpoint = "/api/hardware/schedule";
const char* ringCommandEndpoint = "/api/hardware/ring-command";
const char* legacyRingCommandEndpoint = "/api/bell/ring-now";
const char* heartbeatEndpoint = "/api/hardware/heartbeat";
const char* deviceId = "mhbell-esp32";
const unsigned long SCHEDULE_REFRESH_INTERVAL_MS = 12UL * 60UL * 60UL * 1000UL;
const unsigned long MANUAL_RING_POLL_INTERVAL_MS = 500;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
unsigned long lastScheduleFetch = 0;
unsigned long lastManualRingPoll = 0;
unsigned long lastHeartbeat = 0;
bool backendScheduleLoaded = false;
bool dashboardScheduleSynced = false;
String backendBellTimes[64];
String backendBellLabels[64];
int backendBellDurations[64];
int backendBellCount = 0;
String currentDateString = "";
String lastCommandId = "";
String lastRingStamp = "";
int pendingBellDurationSeconds = 15;

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 2 * 3600;
const int daylightOffset_sec = 0;

int seconds = 0;
int hours = 0;
int month = 0;
int minute = 0;
int date = 0;
int year = 0;
int dayOfTheWeek = 0;

int bellPin = 15;
byte rows = 4;
byte cols = 4;
byte rowPins[4] = { 13, 12, 14, 27 };
byte colPins[4] = { 26, 5, 18, 19 };

char KEY[4][4] = {
  { '1', '2', '3', 'A' },
  { '4', '5', '6', 'B' },
  { '7', '8', '9', 'C' },
  { '*', '0', '#', 'D' }
};

Keypad keys(makeKeymap(KEY), rowPins, colPins, rows, cols);
LiquidCrystal_I2C lcd(0x27, 16, 2);

byte currentMode = 0;
byte periodStep = 0;
byte vacancyStep = 0;

byte periodHours[25] = { 7, 8, 8, 9, 10, 10, 11, 11, 12, 13, 14, 14, 15, 15, 16 };
byte periodMin[25] = { 50, 10, 50, 30, 10, 25, 5, 55, 25, 30, 10, 50, 30, 40, 20 };

byte publicHolidayMonth[19] = { 1, 1, 2, 2, 3, 4, 4, 4, 5, 5, 7, 7, 7, 8, 8, 8, 12, 12, 12 };
byte publicHolidayDate[19] = { 1, 2, 1, 2, 20, 3, 6, 7, 1, 27, 1, 4, 6, 7, 15, 17, 25, 26, 28 };
byte weekEndHours[2] = {  };
byte weekEndMin[2] = {  };

byte vacancyMonthPeriod[2] = { 1, 4 };
byte vacancyDatePeriod[2] = { 19, 15 };

bool termActive;
String inputText = "";

#define EEPROM_SIZE 512
#define ADDR_FLAG 0
#define ADDR_PERIOD_HOUR 10
#define ADDR_PERIOD_MIN 40
#define ADDR_VAC_MONTH 80
#define ADDR_VAC_DATE 90

bool beOn = true;
long timeT = 0;
int i = 5;

// WiFi management variables
unsigned long lastWiFiCheck = 0;
const unsigned long WiFi_CHECK_INTERVAL = 30000;
bool timeSynced = false;
int wifiReconnectCount = 0;

String today[7] = { "SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT" };

String getCurrentDateString() {
  char buffer[11];
  sprintf(buffer, "%04d-%02d-%02d", year, month, date);
  return String(buffer);
}

String formatCurrentTime() {
  char buffer[9];
  sprintf(buffer, "%02d:%02d:%02d", hours, minute, seconds);
  return String(buffer);
}

String normalizeBackendTime(String timeString) {
  timeString.trim();
  if (timeString.length() == 5) {
    return timeString + ":00";
  }
  if (timeString.length() >= 8) {
    return timeString.substring(0, 8);
  }
  return timeString;
}

bool fetchBellSchedule() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = String(backendUrl) + String(scheduleEndpoint) + "?date=" + currentDateString;
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode != HTTP_CODE_OK) {
    http.end();
    dashboardScheduleSynced = false;
    backendScheduleLoaded = false;
    return false;
  }

  String payload = http.getString();
  http.end();

  StaticJsonDocument<4096> doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    dashboardScheduleSynced = false;
    backendScheduleLoaded = false;
    return false;
  }

  if (!doc["success"] || !doc["data"].is<JsonArray>()) {
    dashboardScheduleSynced = false;
    backendScheduleLoaded = false;
    return false;
  }

  JsonArray array = doc["data"].as<JsonArray>();
  backendBellCount = 0;

  for (JsonObject item : array) {
    if (backendBellCount >= 64) {
      break;
    }

    const char* timeValue = item["time"];
    if (!timeValue) {
      continue;
    }

    String timeString = normalizeBackendTime(String(timeValue));
    if (timeString.length() == 8) {
      backendBellTimes[backendBellCount] = timeString;
      backendBellLabels[backendBellCount] = item["label"] | "Dashboard Bell";
      backendBellDurations[backendBellCount] = item["duration_seconds"] | 15;
      backendBellCount++;
    }
  }

  dashboardScheduleSynced = true;
  backendScheduleLoaded = backendBellCount > 0;
  lastScheduleFetch = millis();

  Serial.print("Backend schedule fetched: ");
  Serial.println(backendBellCount);

  return true;
}

bool shouldRefreshSchedule() {
  String todayStr = getCurrentDateString();
  if (todayStr != currentDateString) {
    currentDateString = todayStr;
    return true;
  }

  if (millis() - lastScheduleFetch > SCHEDULE_REFRESH_INTERVAL_MS) {
    return true;
  }

  return false;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = String(backendUrl) + String(heartbeatEndpoint);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"device_id\":\"" + String(deviceId) + "\"}";
  int httpCode = http.POST(payload);
  Serial.print("Heartbeat status: ");
  Serial.println(httpCode);
  http.end();
  lastHeartbeat = millis();
}

bool pollHardwareRingCommandAt(const char* endpoint, String& reason) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = String(backendUrl) + String(endpoint);
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode != HTTP_CODE_OK) {
    http.end();
    return false;
  }

  String payload = http.getString();
  http.end();

  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print("Manual ring JSON parse failed: ");
    Serial.println(error.c_str());
    return false;
  }

  if (doc["ring"] != true) {
    return false;
  }

  if (doc["command"].is<JsonObject>()) {
    JsonObject command = doc["command"].as<JsonObject>();
    const char* commandId = command["id"];
    if (commandId && lastCommandId == String(commandId)) {
      return false;
    }
    if (commandId) {
      lastCommandId = String(commandId);
    }

    const char* commandReason = command["reason"];
    reason = commandReason ? String(commandReason) : "Hardware Ring";
    pendingBellDurationSeconds = command["duration_seconds"] | 15;
    if (pendingBellDurationSeconds < 1) pendingBellDurationSeconds = 1;
    if (pendingBellDurationSeconds > 60) pendingBellDurationSeconds = 60;
    return true;
  }

  reason = "Manual Ring";
  pendingBellDurationSeconds = 15;
  return true;
}

bool pollHardwareRingCommand(String& reason) {
  if (pollHardwareRingCommandAt(ringCommandEndpoint, reason)) {
    return true;
  }

  return pollHardwareRingCommandAt(legacyRingCommandEndpoint, reason);
}

void printBoth(String l1, String l2);

bool markRingIfNew() {
  String stamp = getCurrentDateString() + " " + formatCurrentTime();
  if (lastRingStamp == stamp) {
    return false;
  }

  lastRingStamp = stamp;
  return true;
}

void ringBell(const String& text = "Scheduled Bell") {
  printBoth("*** BELL RING ***", text);
  digitalWrite(bellPin, LOW);  // Activate active-low relay
  delay((unsigned long)pendingBellDurationSeconds * 1000UL);
  digitalWrite(bellPin, HIGH); // Deactivate active-low relay
  lcd.clear();
  pendingBellDurationSeconds = 15;
}

void printBoth(String l1, String l2 = "") {

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(l1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(l2.substring(0, 16));
  Serial.println(l1 + " " + l2);
}

void loadEEPROM() {
  byte flag = EEPROM.read(ADDR_FLAG); 
  if (flag == 55) {
    EEPROM.get(ADDR_PERIOD_HOUR, periodHours);
    EEPROM.get(ADDR_PERIOD_MIN, periodMin);
    EEPROM.get(ADDR_VAC_MONTH, vacancyMonthPeriod);
    EEPROM.get(ADDR_VAC_DATE, vacancyDatePeriod);
  } else {
    EEPROM.write(ADDR_FLAG, 55);
    EEPROM.put(ADDR_PERIOD_HOUR, periodHours);
    EEPROM.put(ADDR_PERIOD_MIN, periodMin);
    EEPROM.put(ADDR_VAC_MONTH, vacancyMonthPeriod);
    EEPROM.put(ADDR_VAC_DATE, vacancyDatePeriod);
    EEPROM.commit();
  }
}

void showTime() {
  lcd.setCursor(0, 1);
  lcd.print(today[dayOfTheWeek]);
  lcd.print(",  ");
  lcd.print(date);
  lcd.print("/");
  lcd.print(month);
  lcd.print("/");
  lcd.print(year);

  Serial.print("Date: ");
  Serial.print(date);
  Serial.print("/");
  Serial.print(month);
  Serial.print("/");
  Serial.print(year);
  Serial.print("\n");

  lcd.setCursor(0, 0);
  lcd.print("Time: ");
  if (hours < 10) lcd.print("0");
  lcd.print(hours);
  lcd.print(":");
  if (minute < 10) lcd.print("0");
  lcd.print(minute);
  lcd.print(":");
  if (seconds < 10) lcd.print("0");
  lcd.print(seconds);
  
  // Show WiFi status
  lcd.setCursor(15, 0);
  if (WiFi.status() == WL_CONNECTED) {
    lcd.print("W");
  } else {
    lcd.print("X");
  }
}

bool connectToWiFi() {
  Serial.println("\nAttempting to connect to WiFi...");
  Serial.print("SSID: ");
  Serial.println(ssid);
  
  // Disconnect from previous connection
  WiFi.disconnect(true);
  delay(100);
  
  // Set WiFi to station mode
  WiFi.mode(WIFI_STA);
  delay(100);
  
  // Begin connection
  WiFi.begin(ssid, password);
  
  // Wait for connection with timeout
  int attempts = 0;
  int maxAttempts = 40; // 20 second timeout
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    attempts++;
    Serial.print(".");
    
    // Show progress on LCD
    if (attempts % 4 == 0) {
      lcd.setCursor(12, 1);
      lcd.print(String(attempts / 2) + "s");
    }
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    wifiReconnectCount = 0;
    return true;
  } else {
    Serial.println("WiFi connection failed!");
    Serial.print("Error code: ");
    Serial.println(WiFi.status());
    return false;
  }
}

bool syncTime() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot sync time: WiFi not connected");
    return false;
  }
  
  Serial.println("Syncing time with NTP server...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Wait for time sync with timeout
  int attempts = 0;
  struct tm timeinfo;
  
  while (!getLocalTime(&timeinfo) && attempts < 15) {
    delay(1000);
    attempts++;
    Serial.print(".");
  }
  
  Serial.println();
  
  if (getLocalTime(&timeinfo)) {
    seconds = timeinfo.tm_sec;
    hours = timeinfo.tm_hour;
    month = 1 + timeinfo.tm_mon;
    minute = timeinfo.tm_min;
    date = timeinfo.tm_mday;
    year = 1900 + timeinfo.tm_year;
    dayOfTheWeek = timeinfo.tm_wday;
    
    timeSynced = true;
    Serial.println("Time synced successfully!");
    Serial.printf("Current time: %04d-%02d-%02d %02d:%02d:%02d\n", 
                  year, month, date, hours, minute, seconds);
    return true;
  } else {
    Serial.println("Time sync failed!");
    return false;
  }
}

void checkWiFiAndTime() {
  unsigned long currentMillis = millis();
  
  // Check WiFi connection periodically
  if (currentMillis - lastWiFiCheck > WiFi_CHECK_INTERVAL) {
    lastWiFiCheck = currentMillis;
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nWiFi disconnected! Attempting reconnect...");
      printBoth("WiFi Lost", "Reconnecting...");
      
      if (connectToWiFi()) {
        printBoth("WiFi OK", WiFi.localIP().toString());
        delay(1000);
        syncTime(); // Resync time after reconnection
      } else {
        wifiReconnectCount++;
        printBoth("WiFi Failed", "Retry " + String(wifiReconnectCount));
      }
      lcd.clear();
    }
  }
}

void checkTerm() {
  if (month == vacancyMonthPeriod[0] && date >= vacancyDatePeriod[0]) {
    termActive = true;
    EEPROM.put(15, termActive);
    EEPROM.commit();
  }
  if (month == vacancyMonthPeriod[1] && date >= vacancyDatePeriod[1]) {
    termActive = false;
    EEPROM.put(15, termActive);
    EEPROM.commit();
  }
}

void checkBell() {
  EEPROM.get(ADDR_VAC_MONTH, vacancyMonthPeriod);
  EEPROM.get(ADDR_VAC_DATE, vacancyDatePeriod);
  String nowTime = formatCurrentTime();

  if (dashboardScheduleSynced) {
    for (int i = 0; i < backendBellCount; i++) {
      if (backendBellTimes[i] == nowTime && seconds == 0) {
        if (markRingIfNew()) {
          pendingBellDurationSeconds = backendBellDurations[i];
          if (pendingBellDurationSeconds < 1) pendingBellDurationSeconds = 1;
          if (pendingBellDurationSeconds > 60) pendingBellDurationSeconds = 60;
          ringBell(backendBellLabels[i]);
        }
        break;
      }
    }
    return;
  }

  if (dayOfTheWeek == 0 || dayOfTheWeek == 6) {
    for (int i = 0; i < 2; i++) {
      if (hours == weekEndHours[i] && minute == weekEndMin[i] && seconds == 0) {
        if (markRingIfNew()) {
          ringBell("Weekend Bell");
        }
        break;
      }
    }
  } else {
    for (int i = 0; i < 19; i++) {
      if (month == publicHolidayMonth[i] && date == publicHolidayDate[i]) {
        return;
      }
    }
    if (termActive == true) {
      for (int i = 0; i < 25; i++) {
        if (hours == periodHours[i] && minute == periodMin[i] && seconds == 0) {
          if (markRingIfNew()) {
            ringBell("Default Bell");
          }
          break;
        }
      }
    }
  }
}

void handleKeypad() {
  char key = keys.getKey();
  if (!key) return;
  
  if (vacancyStep < 0) vacancyStep = 0;
  if (periodStep < 0) periodStep = 0;

  if (key == '*') {
    vacancyStep--;
    periodStep--;
    inputText = "";
    printBoth("INPUT CLEARED", "");
    return;
  }

  if (key == 'A') {
    currentMode = 1;
    inputText = "";
    printBoth("TIME MODE", "Sync Time Now");
    if (WiFi.status() == WL_CONNECTED) {
      syncTime();
    } else {
      printBoth("WiFi Needed", "Connect First");
      delay(1000);
    }
    return;
  }

  if (key == 'B') {
    currentMode = 2;
    periodStep++;
    if (periodStep > 50) periodStep = 1;
    inputText = "";
    printBoth("PERIOD SHIFT", "Step:" + String(periodStep));
    return;
  }

  if (key == 'C') {
    currentMode = 3;
    vacancyStep++;
    if (vacancyStep > 4) vacancyStep = 1;
    inputText = "";
    printBoth("VAC SHIFT MODE", "Step:" + String(vacancyStep));
    return;
  }

  if (key == '#') {
    if (inputText.length() == 0) {
      currentMode = 0;
      printBoth("RETURN HOME", "");
      delay(800);
      lcd.clear();
      return;
    }

    int value = inputText.toInt();

    if (currentMode == 2) {
      if (periodStep % 2 == 1) {
        int index = (periodStep - 1) / 2;
        periodHours[index] = value;
        EEPROM.put(ADDR_PERIOD_HOUR, periodHours);
        EEPROM.commit();
        printBoth("HOUR SAVED", "P" + String(index + 1));
        lcd.print(" " + String(periodHours[index]) + ":" + String(periodMin[index]));
      } else {
        int index = (periodStep - 2) / 2;
        periodMin[index] = value;
        EEPROM.put(ADDR_PERIOD_MIN, periodMin);
        EEPROM.commit();
        printBoth("MIN SAVED", "P" + String(index + 1));
        lcd.print(" " + String(periodHours[index]) + ":" + String(periodMin[index]));
      }
    }

    if (currentMode == 3) {
      if (vacancyStep == 1) vacancyMonthPeriod[0] = value;
      else if (vacancyStep == 2) vacancyDatePeriod[0] = value;
      else if (vacancyStep == 3) vacancyMonthPeriod[1] = value;
      else if (vacancyStep == 4) vacancyDatePeriod[1] = value;

      EEPROM.put(ADDR_VAC_MONTH, vacancyMonthPeriod);
      EEPROM.put(ADDR_VAC_DATE, vacancyDatePeriod);
      EEPROM.commit();
      lcd.print(" " + String(vacancyMonthPeriod[0]) + "/" + String(vacancyDatePeriod[0]));
      lcd.print(" " + String(vacancyMonthPeriod[1]) + "/" + String(vacancyDatePeriod[1]));
      delay(1000);
    }

    inputText = "";
    return;
  }

  if (isDigit(key)) {
    if (inputText.length() < 2) {
      inputText += key;
      printBoth("INPUT VALUE", inputText);
    } else {
      printBoth("MAX 2 DIGITS", "");
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== SCHOOL BELL SYSTEM STARTING ===");
  
  // Initialize LCD I2C
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();
  
  // Initialize EEPROM
  EEPROM.begin(512);
  
  // Show startup screens
  printBoth("  System Ready", "");
  delay(1500);
  printBoth(" WELCOME TO", "LYCEE DE MUHURA");
  delay(1500);
  printBoth("       CSA", " School BELL");
  delay(1500);
  
  // Initialize bell pin
  pinMode(bellPin, OUTPUT);
  digitalWrite(bellPin, HIGH); // Start with relay OFF (HIGH for active LOW relay)
  
  // Test relay (optional - remove if not needed)
  Serial.println("Testing Relay...");
  printBoth("Testing Relay", "Please wait...");
  delay(1000);
  digitalWrite(bellPin, LOW);  // Activate relay
  Serial.println("Relay should be ON now");
  delay(2000);
  digitalWrite(bellPin, HIGH); // Deactivate relay
  Serial.println("Relay should be OFF now");
  delay(1000);
  printBoth("Relay Test Done", "System Ready");
  delay(1000);
  
  // Load settings from EEPROM
  EEPROM.get(15, termActive);
  loadEEPROM();
  
  // Connect to WiFi
  printBoth("WiFi Connecting", ssid);
  delay(500);
  
  if (connectToWiFi()) {
    printBoth("WiFi Connected", WiFi.localIP().toString());
    delay(1500);
    
    // Sync time
    printBoth("Syncing Time", "Please wait...");
    if (syncTime()) {
      currentDateString = getCurrentDateString();
      fetchBellSchedule();
      sendHeartbeat();
      printBoth("Time Synced", "System Ready");
    } else {
      printBoth("Time Sync Failed", "Using Default");
    }
  } else {
    printBoth("WiFi Failed", "Manual Mode");
    // Set default time
    hours = 8;
    minute = 0;
    seconds = 0;
    date = 1;
    month = 1;
    year = 2024;
    dayOfTheWeek = 1;
  }
  
  delay(2000);
  lcd.clear();
  
  // Print period schedule to serial
  Serial.println("\n--- Period Schedule ---");
  for (int i = 0; i < 15; i++) {
    Serial.print("Period " + String(i + 1) + ": " + String(periodHours[i]) + ":" + String(periodMin[i]) + "\n");
  }
  Serial.println("------------------------\n");
}

void loop() {
  // Check and maintain WiFi connection
  checkWiFiAndTime();
  
  // Get current time if WiFi is connected
  if (WiFi.status() == WL_CONNECTED) {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      seconds = timeinfo.tm_sec;
      hours = timeinfo.tm_hour;
      month = 1 + timeinfo.tm_mon;
      minute = timeinfo.tm_min;
      date = timeinfo.tm_mday;
      year = 1900 + timeinfo.tm_year;
      dayOfTheWeek = timeinfo.tm_wday;
      timeSynced = true;
    }
  }

  if (shouldRefreshSchedule() && WiFi.status() == WL_CONNECTED) {
    currentDateString = getCurrentDateString();
    fetchBellSchedule();
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastManualRingPoll > MANUAL_RING_POLL_INTERVAL_MS) {
    lastManualRingPoll = millis();
    String ringReason = "";
    if (pollHardwareRingCommand(ringReason)) {
      if (markRingIfNew()) {
        ringBell(ringReason);
      }
    }
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
  }
  
  // Debug output every minute
  static int lastMinute = -1;
  if (minute != lastMinute) {
    lastMinute = minute;
    Serial.print("Time: ");
    Serial.print(hours);
    Serial.print(":");
    Serial.print(minute);
    Serial.print(":");
    Serial.print(seconds);
    Serial.print(" | Date: ");
    Serial.print(date);
    Serial.print("/");
    Serial.print(month);
    Serial.print("/");
    Serial.print(year);
    Serial.print(" | WiFi: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  }
  
  checkTerm();
  checkBell();

  if (currentMode == 0) {
    showTime();
  }

  handleKeypad();
  
  delay(100);
}
