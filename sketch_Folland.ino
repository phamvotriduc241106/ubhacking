
#include <Wire.h>
#include <Adafruit_SHT31.h>

Adafruit_SHT31 sht31 = Adafruit_SHT31();

#define SOIL_PIN A0

void setup() {
  Serial.begin(115200);
  Wire.begin();

  if (!sht31.begin(0x44)) {
    Serial.println("WARNING: SHT30 not detected");
  } 
  else {
    Serial.println("SHT30 connected successfully");
  }
}

void loop() {

  float temperature = sht31.readTemperature();
  float humidity = sht31.readHumidity();
  int soilMoisture = analogRead(SOIL_PIN);

  Serial.println();
  Serial.println("------ SENSOR READINGS ------");

  if (!isnan(temperature)) {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" C");
  } 
  else {
    Serial.println("Temperature: Sensor error");
  }

  if (!isnan(humidity)) {
    Serial.print("Air Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  } 
  else {
    Serial.println("Air Humidity: Sensor error");
  }
  
  if (soilMoisture == 0) {
    Serial.println("WARNING: Check soil sensor wiring");
  }
  else{
    Serial.print("Soil Moisture: ");
    Serial.println(soilMoisture);
  }
  
  Serial.println("-----------------------------");
  delay(2000);
}
