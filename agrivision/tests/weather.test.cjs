const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/weather.ts'), 'utf8');
const loaded = new Module('weather');
loaded._compile(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, 'weather.js');
const { latestHourlyIndex, parseWeather, fetchWeather, LOCATIONS } = loaded.exports;
const now = Date.parse('2026-11-08T15:30:00Z');
const loc = LOCATIONS[0];
const payload = {timezone:'America/Recife', utc_offset_seconds:-10800, current:{time:'2026-11-08T12:15',temperature_2m:31,relative_humidity_2m:80,precipitation:0,wind_speed_10m:12}, hourly:{time:['2026-11-08T11:00','2026-11-08T12:00','2026-11-08T13:00'], soil_temperature_0cm:[25,26,99],soil_moisture_0_to_1cm:[0.1,0.2,0.9]}};

test('Petrolina defaults and latest past hourly record', () => {
  assert.deepEqual([loc.latitude,loc.longitude,loc.timezone],[-9.3891,-40.5031,'America/Recife']);
  assert.equal(latestHourlyIndex(payload.hourly.time,-10800,now),1);
  const data = parseWeather(payload,loc,now);
  assert.equal(data.current.temp,31); assert.equal(data.current.precipitation,0);
  assert.equal(data.soil.temperature,26); assert.equal(data.soil.moisture,0.2);
  assert.equal(data.soil.time,'2026-11-08T12:00'); assert.equal(data.fetchedAt,now);
});
test('missing values stay unavailable and no future soil is selected', () => {
  const data = parseWeather({current:{},hourly:{time:['2026-11-08T13:00'],soil_temperature_0cm:[99]} ,utc_offset_seconds:-10800},loc,now);
  assert.equal(data.current.temp,null); assert.equal(data.soil.temperature,null); assert.equal(data.rain24,null);
  const unknownOffset = parseWeather({current:{},hourly:{time:['2026-11-08T10:00'],soil_temperature_0cm:[25]}},loc,now);
  assert.equal(unknownOffset.soil.temperature,null);
  assert.throws(() => parseWeather({},loc,now),/Incomplete/);
});
test('request uses configured location and network failures propagate', async () => {
  const original = global.fetch;
  try {
    global.fetch = async url => { const parsed = new URL(url); assert.equal(parsed.searchParams.get('latitude'),'-9.3891'); assert.equal(parsed.searchParams.get('timezone'),'America/Recife'); return {ok:true,json:async()=>payload}; };
    assert.equal((await fetchWeather(loc)).source,'open-meteo');
    global.fetch = async url => { const parsed = new URL(url); assert.equal(parsed.searchParams.get('latitude'),'42.8864'); assert.equal(parsed.searchParams.get('timezone'),'auto'); return {ok:true,json:async()=>payload}; };
    assert.equal((await fetchWeather(LOCATIONS[1])).locationName, 'Buffalo, NY');
    global.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(fetchWeather(loc),/offline/);
  } finally { global.fetch = original; }
});
