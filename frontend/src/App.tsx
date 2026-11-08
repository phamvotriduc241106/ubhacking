import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Camera, Check, ChevronDown, CloudSun, Droplets, Leaf, LoaderCircle, MapPin, RefreshCw, ScanLine, Settings2, Sparkles, Sprout, Sun, Thermometer, X } from 'lucide-react';
import { fetchLatestSensors, fetchWeather, submitPlantAnalysis } from './services/api';
import type { AnalysisResponse, SensorReading, WeatherSummary } from './types';

const soilOptions = [
  { value: 'unknown', title: "I haven't checked", desc: 'We’ll guide you' },
  { value: 'dry_at_5cm', title: 'Dry', desc: 'Feels dry below the surface' },
  { value: 'moist', title: 'Moist', desc: 'Feels slightly damp' },
  { value: 'wet', title: 'Very wet', desc: 'Feels saturated' },
];

function App() {
  const [sensors, setSensors] = useState<SensorReading | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [lat, setLat] = useState('42.8864');
  const [lon, setLon] = useState('-78.8784');
  const [location, setLocation] = useState<{lat: number; lon: number} | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [soil, setSoil] = useState('unknown');
  const [goal, setGoal] = useState('eat_now');
  const [variety, setVariety] = useState('');
  const [symptoms, setSymptoms] = useState('none');
  const [mode, setMode] = useState<'auto' | 'demo'>('auto');
  const [scenario, setScenario] = useState('red');
  const [manualTemp, setManualTemp] = useState('');
  const [manualHumidity, setManualHumidity] = useState('');
  const [manualDistance, setManualDistance] = useState('');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  const weatherRequest = useRef(0);
  async function loadWeather(latitude?: number, longitude?: number) {
    const id = ++weatherRequest.current;
    setWeatherError(false);
    try {
      const data = await fetchWeather(latitude, longitude, latitude === undefined ? undefined : 'Selected location');
      if (id === weatherRequest.current) setWeather(data);
    } catch { if (id === weatherRequest.current) setWeatherError(true); }
  }
  useEffect(() => {
    fetchLatestSensors().then(setSensors).catch(() => setSensors(null));
    loadWeather();
  }, []);
  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [result]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (resultPreview) URL.revokeObjectURL(resultPreview); }, [resultPreview]);

  function selectFile(selected?: File) {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('That file is not an image. Please choose a JPEG or PNG photo.'); return; }
    if (selected.size > 15 * 1024 * 1024) { setError('Please choose an image smaller than 15 MB.'); return; }
    setError(''); setFile(selected); setPreview(URL.createObjectURL(selected));
  }
  function updateLocation(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(lat), b = Number(lon);
    if (!lat.trim() || !lon.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) { setWeatherError(true); return; }
    setLocation({lat: a, lon: b}); loadWeather(a, b);
  }
  async function analyze(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (mode === 'auto' && !file) { setError('Add a photo to check your plant, or choose a sample in the demo settings.'); return; }
    const data = new FormData();
    if (file) data.append('image', file);
    data.append('crop', 'tomato'); data.append('soil_condition', soil); data.append('harvest_goal', goal); data.append('leaf_symptoms', symptoms);
    if (variety.trim()) data.append('variety', variety.trim());
    if (location) { data.append('latitude', String(location.lat)); data.append('longitude', String(location.lon)); }
    data.append('demo_scenario', mode === 'demo' ? scenario : 'auto');
    if (manualTemp !== '') data.append('manual_temperature_c', manualTemp);
    if (manualHumidity !== '') data.append('manual_humidity_pct', manualHumidity);
    if (manualDistance !== '') data.append('manual_distance_cm', manualDistance);
    setLoading(true);
    try { const response = await submitPlantAnalysis(data); setResultPreview(file && mode === 'auto' ? URL.createObjectURL(file) : null); setResult(response); }
    catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><a href="#top" className="brand" aria-label="FolLand home"><span className="brand-mark"><Sprout size={19}/></span><span>FolLand</span></a><nav className="top-nav"><a className="active" href="#check">Plant check</a><a href="#conditions">Conditions</a><a href="#about">Our approach</a></nav><a href="#check" className="top-action">Start a check <ArrowRight size={15}/></a></header>
    <main id="top" className="main-layout">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-content"><div className="eyebrow light"><span className="status-dot"/> A LITTLE MORE IN TUNE WITH NATURE</div><h1 id="hero-title">A little care.<br/><em>A lot of growth.</em></h1><p>Get to know your tomato plant better, one simple check at a time.</p><a className="hero-button" href="#check">Check my plant <ArrowRight size={17}/></a><div className="hero-caption"><span className="caption-icon"><Sparkles size={15}/></span><span>Thoughtful guidance, rooted in evidence.</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring ring-1"/><div className="art-ring ring-2"/><div className="plant-stem"/><div className="plant-leaf leaf-1"/><div className="plant-leaf leaf-2"/><div className="plant-leaf leaf-3"/><div className="plant-leaf leaf-4"/><div className="plant-fruit fruit-1"/><div className="plant-fruit fruit-2"/><div className="glass-note"><span className="glass-note-icon"><Leaf size={17}/></span><span><strong>Growing together</strong><small>A little attention goes a long way</small></span></div></div><div className="hero-index">01 / YOUR GARDEN COMPANION</div></section>
      <div className="section-heading" id="conditions"><div><div className="eyebrow">YOUR ENVIRONMENT</div><h2>A glance at your surroundings<span>.</span></h2></div><p>A little context for the bigger picture.</p></div>
      <section className="context-grid" aria-label="Environmental conditions"><div className="context-card"><div className="context-top"><span className="context-icon warm"><Sun size={19}/></span><span className="context-label">LOCAL WEATHER</span><span className="mini-tag">{weather?.is_fallback ? 'SAMPLE' : weather ? 'FORECAST' : 'LOADING'}</span></div><div className="context-value">{weather?.temperature_c != null ? `${Math.round(weather.temperature_c)}°` : '—'} <small>C</small></div><div className="context-bottom"><span>{weather?.weather_description || (weatherError ? 'Weather unavailable' : 'Getting weather…')}</span><CloudSun size={17}/></div><div className="context-foot"><MapPin size={13}/> {weather?.location_name || 'Buffalo, NY'}</div></div>
      <div className="context-card"><div className="context-top"><span className="context-icon sage"><Thermometer size={19}/></span><span className="context-label">AIR AROUND YOUR PLANT</span><span className="mini-tag">{sensors?.data_mode === 'live' ? 'LIVE' : sensors?.data_mode === 'simulated' ? 'SIMULATED' : 'UNAVAILABLE'}</span></div><div className="context-value">{sensors?.air_temperature_c != null ? `${sensors.air_temperature_c}°` : '—'} <small>C</small></div><div className="context-bottom"><span>Ambient temperature</span><Thermometer size={17}/></div><div className="context-foot">{sensors?.data_mode === 'simulated' ? 'Sample sensor readings' : sensors?.fresh ? 'Latest sensor reading' : 'No current sensor reading'}</div></div>
      <div className="context-card"><div className="context-top"><span className="context-icon blue"><Droplets size={19}/></span><span className="context-label">AIR HUMIDITY</span><span className="mini-tag">{sensors?.data_mode === 'simulated' ? 'SIMULATED' : sensors?.data_mode === 'live' ? 'LIVE' : 'UNAVAILABLE'}</span></div><div className="context-value">{sensors?.air_relative_humidity_pct != null ? `${sensors.air_relative_humidity_pct}` : '—'} <small>%</small></div><div className="context-bottom"><span>Relative humidity</span><Droplets size={17}/></div><div className="context-foot">Air humidity is not soil moisture</div></div></section>
      <details className="location-details"><summary><MapPin size={14}/> Change weather location <ChevronDown size={14}/></summary><form onSubmit={updateLocation} className="location-form"><label>Latitude<input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)}/></label><label>Longitude<input type="number" step="any" value={lon} onChange={e => setLon(e.target.value)}/></label><button className="secondary-button" type="submit"><RefreshCw size={14}/> Update</button></form>{weatherError && <p className="error-text">Check your coordinates or try again.</p>}</details>
      <section id="check" className="check-section"><div className="check-intro"><div className="eyebrow">LET’S TAKE A CLOSER LOOK</div><h2>Give your plant<br/><em>a moment.</em></h2><p>Share a photo and tell us how the soil feels. We’ll help you decide what to look at next.</p><div className="steps"><div><span>01</span> Add a photo</div><div><span>02</span> Check the soil</div><div><span>03</span> Get thoughtful guidance</div></div><div className="intro-note"><Sprout size={19}/><span>Currently growing with <strong>tomatoes</strong></span></div></div>
      <form className="check-card" onSubmit={analyze}><div className="form-header"><div><span className="eyebrow">YOUR PLANT CHECK</span><h3>How is your tomato doing?</h3></div><span className="form-pill"><Leaf size={13}/> TOMATO</span></div><div className="form-divider"/><div className="question-line"><span className="question-number">01</span><div><h4>Start with a photo</h4><p>A clear, close photo of the fruit works best.</p></div></div><input ref={cameraRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={e => selectFile(e.target.files?.[0])}/><input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={e => selectFile(e.target.files?.[0])}/>{preview ? <div className="photo-preview"><img src={preview} alt="Your selected plant"/><div><strong>{file?.name}</strong><span>Ready to check</span></div><button type="button" aria-label="Remove photo" onClick={() => {setFile(null); setPreview(null); if(fileRef.current) fileRef.current.value = ''; if(cameraRef.current) cameraRef.current.value = '';}}><X size={18}/></button></div> : <div className="upload-zone"><span className="upload-icon"><Camera size={22}/></span><strong>A little snapshot goes a long way</strong><span>JPG or PNG · up to 15 MB</span><div className="upload-actions"><button type="button" onClick={() => cameraRef.current?.click()}>Take a photo</button><button type="button" onClick={() => fileRef.current?.click()}>Choose a photo</button></div></div>}
      <div className="question-line soil-question"><span className="question-number">02</span><div><h4>How does the soil feel?</h4><p>Check about 2 inches (5 cm) below the surface.</p></div></div><div className="soil-grid">{soilOptions.map(item => <button key={item.value} type="button" onClick={() => setSoil(item.value)} aria-pressed={soil === item.value} className={`soil-option ${soil === item.value ? 'selected' : ''}`}><span className="soil-check">{soil === item.value && <Check size={12}/>}</span><strong>{item.title}</strong><small>{item.desc}</small></button>)}</div>
      <p className="analysis-notice">Photo analysis uses the local model and may send your image to Google Gemini when configured by the operator.</p><details className="advanced"><summary><Settings2 size={15}/> More options <span>Optional</span><ChevronDown size={15}/></summary><div className="advanced-content"><label>Tomato variety <input value={variety} onChange={e => setVariety(e.target.value)} placeholder="For example, cherry tomato"/></label><label>Harvest goal <select value={goal} onChange={e => setGoal(e.target.value)}><option value="eat_now">Eat fresh</option><option value="store_transport">Store or transport</option></select></label><label>What do the leaves look like? <select value={symptoms} onChange={e => setSymptoms(e.target.value)}><option value="none">No symptoms noticed</option><option value="yellowing">Yellowing</option><option value="browning_spots">Brown spots</option><option value="wilting">Wilting</option></select></label><label>Air temperature (°C) <input type="number" min="-40" max="85" step="any" value={manualTemp} onChange={e => setManualTemp(e.target.value)} placeholder="Optional"/></label><label>Air humidity (%) <input type="number" min="0" max="100" step="any" value={manualHumidity} onChange={e => setManualHumidity(e.target.value)} placeholder="Optional"/></label><label>Sensor distance (cm) <input type="number" min="2" max="450" step="any" value={manualDistance} onChange={e => setManualDistance(e.target.value)} placeholder="Optional"/></label><p>Manual values replace sensor readings for this check. Distance alone is not plant height.</p><label>Try a sample instead <select value={mode === 'auto' ? 'auto' : scenario} onChange={e => { if(e.target.value === 'auto') setMode('auto'); else { setMode('demo'); setScenario(e.target.value); } }}><option value="auto">Analyze my photo</option><option value="red">Demo: red tomato</option><option value="turning">Demo: turning tomato</option><option value="green">Demo: green tomato</option><option value="uncertain">Demo: uncertain image</option></select></label>{mode === 'demo' && <p>Demo results are simulated and do not analyze your photo.</p>}</div></details>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="submit-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={18}/> Preparing your guidance…</> : <>See my plant check <ArrowRight size={18}/></>}</button><p className="form-disclaimer"><Sparkles size={13}/> Guidance to help you observe, not a diagnosis.</p></form></section>
      {result && <section className="results" ref={resultRef} aria-live="polite"><div className="section-heading"><div><div className="eyebrow">YOUR PLANT CHECK</div><h2>Here’s what we found<span>.</span></h2></div><p>{result.visual_observations.is_simulated ? 'Demo scenario · simulated result' : (result.visual_observations.ai_provider || result.detector?.status === 'ok') ? 'Photo analysis · review the details' : 'Photo analysis unavailable'}</p></div><div className="result-overview"><span className="context-icon sage"><ScanLine size={20}/></span><div><strong>{result.visual_observations.stage_label}</strong><p>{result.visual_observations.observation_notes}</p></div></div>{result.detector && <div className="result-overview"><div><strong>Fruit detection · {result.detector.status}</strong><p>{result.detector.message}</p><p>{result.detector.status === 'ok' ? `Detected ${result.detector.detections.length} candidate fruit. ` + Object.entries(result.detector.counts).map(([label, count]) => `${label.replace('_', ' ')}: ${count}`).join(' · ') : 'Model predictions are unavailable.'}</p>{result.disagreement && <p>{result.disagreement}</p>}{result.detector.detections.map((d,i) => <p key={i}>Fruit {i+1}: {d.label.replace('_',' ')} · model score {(100*d.confidence).toFixed(0)}% {d.uncertain ? '· uncertain' : ''}{d.raw_label !== d.label ? ' · rotten check disagreed' : ''}</p>)}</div></div>}
      {resultPreview && result.detector?.status === 'ok' && result.detector.width && result.detector.height && <div className="detection-image"><img src={resultPreview} alt="Plant photo with detected fruit marked"/><svg viewBox={`0 0 ${result.detector.width} ${result.detector.height}`} preserveAspectRatio="none" aria-hidden="true">{result.detector.detections.map((d,i) => <g key={i}><rect x={d.box[0]} y={d.box[1]} width={d.box[2]-d.box[0]} height={d.box[3]-d.box[1]} fill="none" stroke="#e7ff8c" strokeWidth={Math.max(2,result.detector!.width!/300)}/></g>)}</svg></div>}
      {result.report && <article className="farmer-report"><div className="form-header"><div><span className="eyebrow">YOUR REPORT · {result.report.source === 'gemini' ? 'GEMINI' : 'AUTOMATIC FALLBACK'}</span><h3>Your plant, in plain language</h3></div></div><p>{result.report.source === 'deterministic' && result.report.gemini_status !== 'available' ? `Gemini report unavailable (${result.report.gemini_status.replace(/_/g, ' ')}); showing a rule-based report.\n\n` : ''}{result.report.text}</p><button type="button" className="secondary-button" onClick={() => { const url = URL.createObjectURL(new Blob([result.report!.text], {type:'text/plain'})); const a = document.createElement('a'); a.href = url; a.download = 'folland-report.txt'; a.click(); URL.revokeObjectURL(url); }}>Download report</button></article>}
      <div className="result-grid">{[result.harvest, result.watering, result.fertilizer].map((card, i) => <article className="result-card" key={card.category}><div className="result-card-top"><span className={`context-icon ${['warm','blue','sage'][i]}`}>{i === 0 ? <Sun size={19}/> : i === 1 ? <Droplets size={19}/> : <Leaf size={19}/>}</span><span className="eyebrow">{card.category}</span><span className="result-number">0{i+1}</span></div><h3>{card.title}</h3><p>{card.recommendation}</p><div className="next-step"><span>NEXT STEP</span><p>{card.next_action}</p></div><details><summary>Evidence & things to consider <ChevronDown size={15}/></summary><div className="result-detail"><strong>What informed this</strong>{card.evidence.map((item, index) => <p key={index}><b>{item.type === 'WEATHER_FORECAST' && result.weather_data.is_fallback ? 'Sample weather' : item.label}</b> · {item.type === 'WEATHER_FORECAST' && result.weather_data.is_fallback ? 'SIMULATED WEATHER' : item.type.replace(/_/g,' ')}<br/>{item.type === 'WEATHER_FORECAST' ? 'Daily precipitation totals are available, but are not rolling 24-hour measurements.' : item.detail}</p>)}<strong>Keep in mind</strong>{card.limitations.map((item, index) => <p key={index}>{item}</p>)}{card.references.map(ref => <a key={ref.id} href={ref.url} target="_blank" rel="noreferrer">{ref.title} ↗</a>)}</div></details></article>)}</div><p className="results-note">Your plant is unique. These suggestions are a starting point, and do not replace a soil test or expert advice.</p></section>}
      <section id="about" className="about-strip"><div className="about-icon"><Sprout size={21}/></div><div><strong>Good care starts with a good question.</strong><p>We show what we know, what we don’t, and where a closer look can help.</p></div><a href="#check">Back to your plant <ArrowDown size={15}/></a></section>
    </main><footer><span className="footer-brand">FolLand</span><span>Made for the little things that grow.</span><span>Thoughtful growing, every day.</span></footer></div>;
}
export default App;
