#include <WiFi.h>
#include <EEPROM.h>
#include <Keypad.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

const char* ssid = "kazungu";
const char* password = "kazungu@29";

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

byte periodHours[25] = {5,6,7, 7, 8, 8, 9, 10, 10, 11, 11, 12, 13, 14, 14, 15, 15, 16,17,18 ,20};
byte periodMin[25] = { 0,55,0,50, 10, 50, 30, 10, 25, 5, 55, 25, 30, 10, 50, 30, 40, 20,0,30 ,30};

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
  
  if (dayOfTheWeek == 0 || dayOfTheWeek == 6) {
    for (int i = 0; i < 2; i++) {
      if (hours == weekEndHours[i] && minute == weekEndMin[i] && seconds == 0) {
        printBoth("*** BELL RING ***", "  Period " + String(i + 1));
        digitalWrite(bellPin, LOW);  // FIXED: LOW activates relay
        delay(15000);
        digitalWrite(bellPin, HIGH); // FIXED: HIGH deactivates relay
        lcd.clear();
        break;
      }
    }
  } else if (dayOfTheWeek != 0 && dayOfTheWeek != 6) {
    for (int i = 0; i < 19; i++) {
      if (month == publicHolidayMonth[i] && date == publicHolidayDate[i]) {
        return;
      }
    }
    if (termActive == true) {
      for (int i = 0; i < 25; i++) {
        if (hours == periodHours[i] && minute == periodMin[i] && seconds == 0) {
          printBoth("*** BELL RING ***", "  Period " + String(i + 1));
          digitalWrite(bellPin, LOW);  // FIXED: LOW activates relay
          delay(15000);
          digitalWrite(bellPin, HIGH); // FIXED: HIGH deactivates relay
          lcd.clear();
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
  
  // Initialize LCD
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
  digitalWrite(bellPin, HIGH);  // Activate relay
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
