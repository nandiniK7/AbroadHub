import { React, useState, useEffect, useMemo, useRef, ChevronLeft, Search, Check, MapPin, X, User, AtSign, CalendarDays, Phone, Globe, Building2, Camera, Edit3, FileText, ChevronDown, ArrowRight, compressImageFile, BriefcaseBusiness, Sparkles, Sprout, ShoppingCart, ShieldCheck, Scale, Wrench, Zap, Scissors, Dumbbell, GraduationCap, Music, Video, Palette, PawPrint, Car, Hammer, Stethoscope, Cake, Shirt, Wallet, Moon, Wand2, Martini, Utensils, HomeIcon, MapPinned } from '../../shared/deps.js';
import { countries, businessCategories, providers } from '../../shared/deps.js';
import { CATEGORY_FIELD_CONFIG } from './categoryFields.js';
import { DIAL_CODES, DIAL_CODE_LIST } from './dialCodes.js';
import Avatar from '../../components/Avatar/Avatar.jsx';
import { api } from '../../api.js';

const LANGUAGES = ['English', 'Spanish', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'French', 'German', 'Mandarin', 'Arabic'];
const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'];
const todayISO = new Date().toISOString().slice(0, 10);

// Per-category icon for the read-only Service field — falls back to a
// sensible generic icon (business vs. individual-profession) for any
// category not explicitly mapped here, per product ask.
const CATEGORY_ICONS = {
  'Beauty & Spa': Sparkles, 'Farms': Sprout, 'Fashion': Shirt, 'Grocery Stores': ShoppingCart,
  'Health Center': Stethoscope, 'Insurance': ShieldCheck, 'Legal Consultant': Scale,
  'Night Clubs': Moon, 'Real Estate': Building2, 'Restaurants': Utensils, 'Tax Filing': Wallet,
  'Airbnb Host': HomeIcon, 'Astrologer': Sparkles, 'Banquet Hall': Building2, 'Bartender': Martini,
  'Boxing coach': Dumbbell, 'Cake maker/Pastry chef': Cake, 'Car mechanic': Car,
  'Career Counselor': BriefcaseBusiness, 'Catering service': Utensils, 'Chef': Utensils,
  'Chiropractor': Stethoscope, 'Cleaning Services': Sparkles, 'DJ (Disc Jockey)': Music,
  'Dance Instructor': Music, 'Dietitian': Stethoscope, 'Digital marketer': BriefcaseBusiness,
  'Driving Instructor': Car, 'Educational Tutor': GraduationCap, 'Electrician': Zap,
  'Event Decorator': Sparkles, 'Event Organizers': CalendarDays, 'Fashion Designer': Shirt,
  'Financial Advisor': Wallet, 'Florist': Sprout, 'Gardener/Lawn Service': Sprout,
  'Graphic Designer': Palette, 'Gym Trainer': Dumbbell, 'Hair Stylist': Scissors,
  'House Builder': Hammer, 'Interior designer': Palette, 'Language tutor': GraduationCap,
  'Life Coach': BriefcaseBusiness, 'Makeup Artist': Wand2, 'Martial Arts instructor': Dumbbell,
  'Massage Therapist': Stethoscope, 'Mehandi Artist': Wand2, 'Music Band': Music,
  'Music Teacher': Music, 'Nail Artist': Wand2, 'Nutritionist': Stethoscope, 'Painter': Palette,
  'Party Rentals': CalendarDays, 'Pet Groomer': PawPrint, 'Pet Trainer': PawPrint,
  'Photographer': Camera, 'Physical Therapist': Stethoscope, 'Plumber': Wrench,
  'Psychologist': Stethoscope, 'Real Estate Consultant': Building2, 'Sketch Artist': Palette,
  'Speech Therapist': Stethoscope, 'Tailoring/Alteration': Scissors, 'Tattoo Artist': Wand2,
  'Travel Guide': MapPinned, 'Video Editor': Video, 'Videographer': Video, 'Yoga Instructor': Dumbbell
};

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
    name: '', username: '', dateOfBirth: '', gender: '', avatar: '',
    businessName: '', description: '', phone: '', phoneCode: '',
    location: '', lat: null, lon: null, languages: []
  });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');

  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const locationFieldRef = useRef(null);
  useEffect(() => {
    if (!showLocationResults) return;
    const onDocClick = e => {
      if (locationFieldRef.current && !locationFieldRef.current.contains(e.target)) setShowLocationResults(false);
    };
    const onKeyDown = e => { if (e.key === 'Escape') setShowLocationResults(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showLocationResults]);

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
  const nameFieldRef = useRef(null);
  const businessFormRef = useRef(null);
  const personalNameFieldRef = useRef(null);
  const personalFormRef = useRef(null);
  useEffect(() => {
    const target = step === 'country' ? countryInputRef : step === 'category' ? categoryInputRef : step === 'businessForm' ? nameFieldRef : step === 'personalForm' ? personalNameFieldRef : null;
    target?.current?.focus();
  }, [step]);

  // Pre-signup "is this username taken" check for the Personal profile
  // step — advisory only (see the /auth/username-available route), so
  // registration itself still works even if this check fails or is stale.
  const [usernameCheck, setUsernameCheck] = useState({ status: 'idle', checked: '' });
  useEffect(() => {
    if (step !== 'personalForm') return;
    const u = form.username.trim();
    if (u.length < 3) { setUsernameCheck({ status: 'idle', checked: '' }); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.usernameAvailable(u);
        setUsernameCheck({ status: res.available ? 'available' : 'taken', checked: u });
      } catch {
        setUsernameCheck({ status: 'idle', checked: '' });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.username, step]);

  const photoInputRef = useRef(null);
  const [photoError, setPhotoError] = useState('');
  const choosePhoto = e => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setPhotoError('');
    compressImageFile(f).then(dataUrl => setF('avatar', dataUrl)).catch(() => setPhotoError('Unable to read that photo. Please try a different file.'));
  };


  const [locationError, setLocationError] = useState('');
  useEffect(() => {
    const value = form.location.trim();
    if (!value || value.length < 2) { setLocationResults([]); setLocationError(''); return; }
    const timer = setTimeout(async () => {
      try {
        setLocationSearching(true);
        setLocationError('');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error('Location search failed');
        const data = await res.json();
        setLocationResults(Array.isArray(data) ? data : []);
      } catch {
        setLocationResults([]);
        setLocationError('Could not search locations right now. Please try again.');
      }
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
    if (step === 'personalForm') { setStep('accountType'); return; }
  };

  const chooseAccountType = type => {
    setAccountType(type);
    if (type === 'personal') {
      setForm(x => ({ ...x, phoneCode: x.phoneCode || DIAL_CODES[country] || '+1' }));
      setStep('personalForm');
    } else {
      setStep('category');
    }
  };

  const chooseCategory = c => {
    setCategory(c.label);
    setCategoryType(c.type);
    setFields({});
    setForm(x => ({ ...x, phoneCode: x.phoneCode || DIAL_CODES[country] || '+1' }));
    setStep('businessForm');
  };

  const submitBusiness = () => {
    if (!form.name.trim() || !form.username.trim() || !form.location.trim()) {
      setError('Full name, username and location are required.');
      return;
    }
    if (categoryType === 'business' && !form.businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    // Individual providers (e.g. a Photographer) don't have a separate
    // business identity — their own name doubles as the listing name so the
    // existing business_name-backed discovery/profile paths keep working
    // without showing a redundant "Business Name" field for this category.
    const businessName = categoryType === 'business' ? form.businessName.trim() : form.name.trim();
    onComplete({
      country, accountType: 'business', category, categoryType,
      name: form.name.trim(), username: form.username.trim(),
      gender: form.gender, dateOfBirth: form.dateOfBirth.trim(), avatar: form.avatar,
      businessName, description: form.description.trim(),
      phone: form.phone.trim(), phoneCode: form.phoneCode,
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

  const submitPersonal = () => {
    const name = form.name.trim();
    const username = form.username.trim();
    if (!name || !username) {
      setError('Full name and username are required.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (usernameCheck.status === 'taken' && usernameCheck.checked === username) {
      setError('That username is already taken. Please choose another.');
      return;
    }
    if (form.phone.trim() && !/^[0-9]{6,15}$/.test(form.phone.trim())) {
      setError('Enter a valid phone number.');
      return;
    }
    onComplete({
      country, accountType: 'personal',
      name, username,
      gender: form.gender, dateOfBirth: form.dateOfBirth.trim(), avatar: form.avatar,
      phone: form.phone.trim(), phoneCode: form.phoneCode,
      languages: form.languages, description: form.description.trim()
    });
  };

  // Same Enter-to-next-field behavior as the business form (see
  // handleBusinessFormKeyDown above), kept as its own copy scoped to
  // personalFormRef so nothing here can affect the business form.
  const handlePersonalFormKeyDown = e => {
    if (e.key !== 'Enter') return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault();
    const container = personalFormRef.current;
    if (!container) return;
    const focusable = Array.from(container.querySelectorAll('input:not([type="checkbox"]), select'))
      .filter(el => !el.disabled && el.offsetParent !== null);
    const idx = focusable.indexOf(e.target);
    if (idx > -1 && idx < focusable.length - 1) focusable[idx + 1].focus();
    else submitPersonal();
  };

  const fieldConfig = categoryType === 'business' ? (CATEGORY_FIELD_CONFIG[category] || []) : [];
  const ServiceIcon = CATEGORY_ICONS[category] || (categoryType === 'business' ? Building2 : BriefcaseBusiness);

  return (
    <main className="auth-page">
      <div className={`auth-card onboarding-card${step === 'businessForm' || step === 'personalForm' ? ' provider-setup-card' : ''}`}>
        {step !== 'businessForm' && step !== 'personalForm' &&
          <button className="auth-back" type="button" onClick={goBack} aria-label="Back"><ChevronLeft/></button>
        }

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
          <div className="provider-setup" ref={businessFormRef} onKeyDown={handleBusinessFormKeyDown}>

            <div className="provider-setup-header">
              <button type="button" className="provider-setup-back" onClick={goBack} aria-label="Back"><ChevronLeft/></button>
              <button type="button" className="provider-setup-cancel" onClick={onCancel}>Cancel</button>
            </div>

            <div className="provider-setup-photo">
              <button type="button" className="provider-setup-photo-button" onClick={() => photoInputRef.current?.click()} aria-label="Change profile picture">
                <Avatar src={form.avatar} text={form.name || category}/>
                <span className="provider-setup-photo-edit"><Edit3 size={14}/></span>
              </button>
              <input hidden ref={photoInputRef} type="file" accept="image/*" onChange={choosePhoto}/>
              <p>Profile Picture</p>
              {photoError && <div className="error provider-setup-photo-error">{photoError}</div>}
            </div>

            <label className="provider-setup-field">
              <User size={18}/>
              <input ref={nameFieldRef} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Full Name" autoComplete="name"/>
            </label>

            <label className="provider-setup-field">
              <AtSign size={18}/>
              <input value={form.username} onChange={e => setF('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="Username" autoComplete="username"/>
            </label>

            <div className="provider-setup-dob-label">Date of Birth (Optional)</div>
            <label className="provider-setup-field">
              <CalendarDays size={18}/>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => setF('dateOfBirth', e.target.value)}
                max={todayISO}
                aria-label="Date of Birth (Optional)"
              />
            </label>

            <div className="provider-setup-section-label">Gender</div>
            <div className="provider-setup-gender-row">
              {GENDER_OPTIONS.map(g => (
                <button type="button" key={g} className={`provider-setup-gender-pill${form.gender === g ? ' selected' : ''}`} onClick={() => setF('gender', g)}>
                  {g}
                </button>
              ))}
            </div>

            <div className="provider-setup-phone-row">
              <select className="provider-setup-dial-code" value={form.phoneCode} onChange={e => setF('phoneCode', e.target.value)} aria-label="Country code">
                {DIAL_CODE_LIST.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
              <label className="provider-setup-field provider-setup-phone-input">
                <Phone size={18}/>
                <input type="tel" value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="Mobile Number (Optional)"/>
              </label>
            </div>

            <div className="provider-setup-section-label">Service</div>
            <div className="provider-setup-field provider-setup-readonly">
              <ServiceIcon size={18}/>
              <span>{category}</span>
            </div>

            {categoryType === 'business' &&
              <label className="provider-setup-field">
                <Building2 size={18}/>
                <input value={form.businessName} onChange={e => setF('businessName', e.target.value)} placeholder="Business Name" maxLength={120}/>
              </label>
            }

            {fieldConfig.map(f => (
              <div className="form-field provider-setup-category-field" key={f.key}>
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

            <label className="provider-setup-field provider-setup-location-field" ref={locationFieldRef}>
              <MapPin size={18}/>
              <input
                value={form.location}
                onChange={e => { setF('location', e.target.value); setShowLocationResults(true); }}
                onFocus={() => setShowLocationResults(true)}
                placeholder="Location"
              />
              {showLocationResults && (form.location.trim().length >= 2 || locationSearching) &&
                <div className="location-results">
                  {locationSearching && <div className="location-result muted">Searching…</div>}
                  {!locationSearching && locationError && <div className="location-result muted">{locationError}</div>}
                  {!locationSearching && !locationError && locationResults.map(item => (
                    <button type="button" className="location-result" key={item.place_id} onClick={() => {
                      setForm(x => ({ ...x, location: item.display_name, lat: Number(item.lat), lon: Number(item.lon) }));
                      setShowLocationResults(false);
                    }}>
                      <MapPin size={16}/><span>{item.display_name}</span>
                    </button>
                  ))}
                  {!locationSearching && !locationError && !locationResults.length && <div className="location-result muted">No matching locations found.</div>}
                </div>
              }
            </label>

            <div className="provider-setup-field provider-setup-lang-field" ref={langPickerRef}>
              <Globe size={18}/>
              <button type="button" className="provider-setup-lang-trigger" onClick={() => setLangOpen(v => !v)}>
                {form.languages.length ? form.languages.join(', ') : 'Select languages you speak'}
              </button>
              <ChevronDown size={16}/>
              {langOpen &&
                <div className="lang-picker-panel provider-setup-lang-panel">
                  {LANGUAGES.map(l => (
                    <label className="lang-picker-option" key={l}>
                      <input type="checkbox" checked={form.languages.includes(l)} onChange={() => toggleLanguage(l)} disabled={!form.languages.includes(l) && form.languages.length >= 3}/>
                      {l}
                    </label>
                  ))}
                </div>
              }
            </div>
            {form.languages.length > 0 &&
              <div className="lang-chips provider-setup-lang-chips">
                {form.languages.map(l => (
                  <span className="lang-chip" key={l}>{l}<button type="button" onClick={() => toggleLanguage(l)} aria-label={`Remove ${l}`}><X size={12}/></button></span>
                ))}
              </div>
            }

            <label className="provider-setup-field provider-setup-bio-field">
              <FileText size={18}/>
              <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Bio (Optional)" maxLength={1500}/>
            </label>

            {error && <div className="error">{error}</div>}

            <button className="primary provider-setup-complete" type="button" onClick={submitBusiness}>
              Complete <ArrowRight size={18}/>
            </button>
          </div>
        }

        {step === 'personalForm' &&
          <div className="provider-setup" ref={personalFormRef} onKeyDown={handlePersonalFormKeyDown}>

            <div className="provider-setup-header">
              <button type="button" className="provider-setup-back" onClick={goBack} aria-label="Back"><ChevronLeft/></button>
              <button type="button" className="provider-setup-cancel" onClick={onCancel}>Logout</button>
            </div>

            <h1 className="personal-setup-title">Complete Profile</h1>
            <p className="personal-setup-subtitle">Please provide the following information to complete your profile.</p>

            <div className="provider-setup-photo">
              <button type="button" className="provider-setup-photo-button" onClick={() => photoInputRef.current?.click()} aria-label="Change profile picture">
                <Avatar src={form.avatar} text={form.name}/>
                <span className="provider-setup-photo-edit"><Edit3 size={14}/></span>
              </button>
              <input hidden ref={photoInputRef} type="file" accept="image/*" onChange={choosePhoto}/>
              <p>Profile Picture</p>
              {photoError && <div className="error provider-setup-photo-error">{photoError}</div>}
            </div>

            <label className="provider-setup-field">
              <User size={18}/>
              <input ref={personalNameFieldRef} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Full Name" autoComplete="name"/>
            </label>

            <label className="provider-setup-field">
              <AtSign size={18}/>
              <input value={form.username} onChange={e => setF('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="Username" autoComplete="username"/>
            </label>
            {form.username.trim().length >= 3 && usernameCheck.checked === form.username.trim() && usernameCheck.status === 'taken' &&
              <div className="field-error personal-setup-field-msg">Username is already taken.</div>
            }
            {form.username.trim().length >= 3 && usernameCheck.checked === form.username.trim() && usernameCheck.status === 'available' &&
              <div className="personal-setup-field-msg personal-setup-field-ok">Username is available.</div>
            }

            <div className="provider-setup-dob-label">Date of Birth (Optional)</div>
            <label className="provider-setup-field">
              <CalendarDays size={18}/>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => setF('dateOfBirth', e.target.value)}
                max={todayISO}
                aria-label="Date of Birth (Optional)"
              />
            </label>

            <div className="provider-setup-section-label">Gender</div>
            <div className="provider-setup-gender-row">
              {GENDER_OPTIONS.map(g => (
                <button type="button" key={g} className={`provider-setup-gender-pill${form.gender === g ? ' selected' : ''}`} onClick={() => setF('gender', g)}>
                  {g}
                </button>
              ))}
            </div>

            <div className="provider-setup-phone-row">
              <select className="provider-setup-dial-code" value={form.phoneCode} onChange={e => setF('phoneCode', e.target.value)} aria-label="Country code">
                {DIAL_CODE_LIST.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
              <label className="provider-setup-field provider-setup-phone-input">
                <Phone size={18}/>
                <input type="tel" value={form.phone} onChange={e => setF('phone', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Mobile Number (Optional)"/>
              </label>
            </div>

            <div className="provider-setup-field provider-setup-lang-field" ref={langPickerRef}>
              <Globe size={18}/>
              <button type="button" className="provider-setup-lang-trigger" onClick={() => setLangOpen(v => !v)}>
                {form.languages.length ? form.languages.join(', ') : 'Select languages you speak'}
              </button>
              <ChevronDown size={16}/>
              {langOpen &&
                <div className="lang-picker-panel provider-setup-lang-panel">
                  {LANGUAGES.map(l => (
                    <label className="lang-picker-option" key={l}>
                      <input type="checkbox" checked={form.languages.includes(l)} onChange={() => toggleLanguage(l)} disabled={!form.languages.includes(l) && form.languages.length >= 3}/>
                      {l}
                    </label>
                  ))}
                </div>
              }
            </div>
            {form.languages.length > 0 &&
              <div className="lang-chips provider-setup-lang-chips">
                {form.languages.map(l => (
                  <span className="lang-chip" key={l}>{l}<button type="button" onClick={() => toggleLanguage(l)} aria-label={`Remove ${l}`}><X size={12}/></button></span>
                ))}
              </div>
            }

            <label className="provider-setup-field provider-setup-bio-field">
              <FileText size={18}/>
              <div className="personal-setup-bio-body">
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Bio (Optional)" maxLength={300}/>
                <span className="personal-setup-bio-count">{form.description.length}/300</span>
              </div>
            </label>

            {error && <div className="error">{error}</div>}

            <button className="primary provider-setup-complete" type="button" onClick={submitPersonal}>
              Complete <ArrowRight size={18}/>
            </button>
          </div>
        }
      </div>
    </main>
  );
}

export default Onboarding;
