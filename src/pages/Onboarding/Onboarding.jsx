import { React, useState, useEffect, useMemo, useRef, ChevronLeft, Search, Check, MapPin, X } from '../../shared/deps.js';
import { countries, businessCategories, providers } from '../../shared/deps.js';
import { CATEGORY_FIELD_CONFIG } from './categoryFields.js';

const LANGUAGES = ['English', 'Spanish', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'French', 'German', 'Mandarin', 'Arabic'];

// Alphabetical, combined business-category + individual-profession list, per
// the product rule that Category Selection is ONE list — the backend still
// knows the difference (categoryType) so existing discovery paths
// (Providers.jsx via occupation, business accounts via business_category)
// keep working unmodified.
const COMBINED_CATEGORIES = [
  ...businessCategories.map(c => ({ label: c, type: 'business' })),
  ...providers.map(p => ({ label: p, type: 'provider' }))
].sort((a, b) => a.label.localeCompare(b.label));

function Onboarding({ onComplete, onCancel }) {
  const [step, setStep] = useState('country');
  const [country, setCountry] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [accountType, setAccountType] = useState('');
  const [category, setCategory] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [form, setForm] = useState({
    businessName: '', description: '', phone: '', businessHours: '',
    location: '', lat: null, lon: null, languages: []
  });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');

  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const langPickerRef = useRef(null);
  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = e => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [langOpen]);

  // Autofocus the first useful field whenever the step changes, so moving
  // through onboarding feels intentional rather than leaving focus stranded.
  const countryInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const businessNameRef = useRef(null);
  const businessFormRef = useRef(null);
  useEffect(() => {
    const target = step === 'country' ? countryInputRef : step === 'category' ? categoryInputRef : step === 'businessForm' ? businessNameRef : null;
    target?.current?.focus();
  }, [step]);


  useEffect(() => {
    const value = form.location.trim();
    if (!value || value.length < 2) { setLocationResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        setLocationSearching(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setLocationResults(Array.isArray(data) ? data : []);
      } catch { setLocationResults([]); }
      finally { setLocationSearching(false); }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.location]);

  const setF = (k, v) => { setForm(x => ({ ...x, [k]: v })); setError(''); };

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    return q ? countries.filter(c => c.toLowerCase().includes(q)) : countries;
  }, [countryQuery]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return q ? COMBINED_CATEGORIES.filter(c => c.label.toLowerCase().includes(q)) : COMBINED_CATEGORIES;
  }, [categoryQuery]);

  const toggleMultiOption = (key, opt) => {
    setFields(x => {
      const cur = Array.isArray(x[key]) ? x[key] : [];
      const next = cur.includes(opt) ? cur.filter(v => v !== opt) : [...cur, opt];
      return { ...x, [key]: next };
    });
  };
  const toggleLanguage = lang => {
    setForm(x => {
      const cur = x.languages;
      const next = cur.includes(lang) ? cur.filter(v => v !== lang) : (cur.length >= 3 ? cur : [...cur, lang]);
      return { ...x, languages: next };
    });
  };

  const goBack = () => {
    setError('');
    if (step === 'country') { onCancel(); return; }
    if (step === 'accountType') { setStep('country'); return; }
    if (step === 'category') { setStep('accountType'); return; }
    if (step === 'businessForm') { setStep('category'); return; }
  };

  const chooseAccountType = type => {
    setAccountType(type);
    if (type === 'personal') {
      onComplete({ country, accountType: 'personal' });
    } else {
      setStep('category');
    }
  };

  const chooseCategory = c => {
    setCategory(c.label);
    setCategoryType(c.type);
    setFields({});
    setStep('businessForm');
  };

  const submitBusiness = () => {
    if (!form.businessName.trim() || !form.location.trim()) {
      setError('Business name and location are required.');
      return;
    }
    onComplete({
      country, accountType: 'business', category, categoryType,
      businessName: form.businessName.trim(), description: form.description.trim(),
      phone: form.phone.trim(), businessHours: form.businessHours.trim(),
      location: form.location, lat: form.lat, lon: form.lon,
      languages: form.languages, businessFields: fields
    });
  };

  // Enter moves focus to the next input/select in the business form instead
  // of doing nothing (there's no <form> here) or submitting prematurely.
  // Walking the live DOM (rather than a fixed ref chain) means this works
  // for the dynamically-rendered category-specific fields too. Textareas
  // and buttons (chips, checkboxes) are left alone so Enter keeps its
  // normal meaning there.
  const handleBusinessFormKeyDown = e => {
    if (e.key !== 'Enter') return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault();
    const container = businessFormRef.current;
    if (!container) return;
    const focusable = Array.from(container.querySelectorAll('input:not([type="checkbox"]), select'))
      .filter(el => !el.disabled && el.offsetParent !== null);
    const idx = focusable.indexOf(e.target);
    if (idx > -1 && idx < focusable.length - 1) focusable[idx + 1].focus();
    else submitBusiness();
  };

  const fieldConfig = categoryType === 'business' ? (CATEGORY_FIELD_CONFIG[category] || []) : [];

  return (
    <main className="auth-page">
      <div className="auth-card onboarding-card">
        <button className="auth-back" type="button" onClick={goBack} aria-label="Back"><ChevronLeft/></button>

        {step === 'country' &&
          <>
            <h1>Your Native Country</h1>
            <p>Tell us where you're originally from.</p>
            <div className="onboarding-search">
              <Search size={17}/>
              <input ref={countryInputRef} value={countryQuery} onChange={e => setCountryQuery(e.target.value)} placeholder="Search countries"/>
            </div>
            <div className="onboarding-list">
              {filteredCountries.map(c => (
                <button type="button" key={c} className={`onboarding-list-row${country === c ? ' selected' : ''}`} onClick={() => setCountry(c)}>
                  <span>{c}</span>
                  {country === c && <Check size={16}/>}
                </button>
              ))}
              {!filteredCountries.length && <div className="onboarding-empty">No matching countries.</div>}
            </div>
            <button className="primary onboarding-continue" type="button" disabled={!country} onClick={() => setStep('accountType')}>Continue</button>
          </>
        }

        {step === 'accountType' &&
          <>
            <h1>Select Account Type</h1>
            <p>How will you be using AbroadHub?</p>
            <div className="onboarding-option-list">
              <button type="button" className="onboarding-option" onClick={() => chooseAccountType('personal')}>
                <div><b>Personal</b><span>Connect, post and explore as an individual.</span></div>
              </button>
              <button type="button" className="onboarding-option" onClick={() => chooseAccountType('business')}>
                <div><b>Service Provider / Business</b><span>Get discovered in Nearby under your category.</span></div>
              </button>
            </div>
          </>
        }

        {step === 'category' &&
          <>
            <h1>Select Category</h1>
            <p>Choose the category your business or service falls under.</p>
            <div className="onboarding-search">
              <Search size={17}/>
              <input ref={categoryInputRef} value={categoryQuery} onChange={e => setCategoryQuery(e.target.value)} placeholder="Search categories"/>
            </div>
            <div className="onboarding-list">
              {filteredCategories.map(c => (
                <button type="button" key={c.label} className="onboarding-list-row" onClick={() => chooseCategory(c)}>
                  <span>{c.label}</span>
                </button>
              ))}
              {!filteredCategories.length && <div className="onboarding-empty">No matching categories.</div>}
            </div>
          </>
        }

        {step === 'businessForm' &&
          <div ref={businessFormRef} onKeyDown={handleBusinessFormKeyDown}>
            <h1>Business Listing</h1>
            <p>Category: <b>{category}</b></p>

            <label className="form-field">
              <span>Business Name *</span>
              <input ref={businessNameRef} value={form.businessName} onChange={e => setF('businessName', e.target.value)} placeholder="Enter your business name" maxLength={120}/>
            </label>

            {fieldConfig.map(f => (
              <div className="form-field" key={f.key}>
                <span>{f.label}</span>
                {f.type === 'text' &&
                  <input value={fields[f.key] || ''} onChange={e => setFields(x => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder || ''}/>
                }
                {f.type === 'select' &&
                  <select value={fields[f.key] || ''} onChange={e => setFields(x => ({ ...x, [f.key]: e.target.value }))}>
                    <option value="">Select {f.label.toLowerCase()}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                }
                {f.type === 'multiselect' &&
                  <div className="lang-chips onboarding-chip-options">
                    {f.options.map(o => {
                      const selected = Array.isArray(fields[f.key]) && fields[f.key].includes(o);
                      return (
                        <button type="button" key={o} className={`onboarding-chip${selected ? ' selected' : ''}`} onClick={() => toggleMultiOption(f.key, o)}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                }
              </div>
            ))}

            <label className="form-field">
              <span>Add Description</span>
              <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe your business in a few words" maxLength={1500}/>
            </label>

            <label className="form-field">
              <span>Phone Number</span>
              <input type="tel" value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="Enter your mobile number"/>
            </label>

            <label className="form-field">
              <span>Availability Time</span>
              <input value={form.businessHours} onChange={e => setF('businessHours', e.target.value)} placeholder="e.g. 7:00 AM - 8:30 PM"/>
            </label>

            <div className="form-field">
              <span>Languages Known</span>
              <div className="lang-picker" ref={langPickerRef}>
                <button type="button" className="lang-picker-trigger" onClick={() => setLangOpen(v => !v)}>
                  {form.languages.length ? `${form.languages.length} selected` : 'Select up to 3'}
                </button>
                {form.languages.length > 0 &&
                  <div className="lang-chips">
                    {form.languages.map(l => (
                      <span className="lang-chip" key={l}>{l}<button type="button" onClick={() => toggleLanguage(l)} aria-label={`Remove ${l}`}><X size={12}/></button></span>
                    ))}
                  </div>
                }
                {langOpen &&
                  <div className="lang-picker-panel">
                    {LANGUAGES.map(l => (
                      <label className="lang-picker-option" key={l}>
                        <input type="checkbox" checked={form.languages.includes(l)} onChange={() => toggleLanguage(l)} disabled={!form.languages.includes(l) && form.languages.length >= 3}/>
                        {l}
                      </label>
                    ))}
                  </div>
                }
              </div>
            </div>

            <label className="form-field">
              <span>Location *</span>
              <div className="jobs-location-wrap">
                <input
                  value={form.location}
                  onChange={e => { setF('location', e.target.value); setShowLocationResults(true); }}
                  onFocus={() => setShowLocationResults(true)}
                  placeholder="Add your business location"
                />
                {showLocationResults && (form.location.trim().length >= 2 || locationSearching) &&
                  <div className="location-results">
                    {locationSearching && <div className="location-result muted">Searching…</div>}
                    {!locationSearching && locationResults.map(item => (
                      <button type="button" className="location-result" key={item.place_id} onClick={() => {
                        setForm(x => ({ ...x, location: item.display_name, lat: Number(item.lat), lon: Number(item.lon) }));
                        setShowLocationResults(false);
                      }}>
                        <MapPin size={16}/><span>{item.display_name}</span>
                      </button>
                    ))}
                    {!locationSearching && !locationResults.length && <div className="location-result muted">No matching locations found.</div>}
                  </div>
                }
              </div>
            </label>

            {error && <div className="error">{error}</div>}

            <button className="primary onboarding-continue" type="button" onClick={submitBusiness}>Continue</button>
          </div>
        }
      </div>
    </main>
  );
}

export default Onboarding;
