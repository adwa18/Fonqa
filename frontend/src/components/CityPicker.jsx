// src/components/CityPicker.jsx — (A) location autocomplete
import { useState, useCallback, useRef } from 'react';
import { Search, X, MapPin, Loader } from 'lucide-react';

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CityPicker({ value, onSelect, onClose }) {
  const [query, setQuery]     = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Use Open-Meteo Geocoding API (free, no key needed)
  const searchCities = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError('Search failed. Try typing your city manually.');
      setResults([]);
    } finally { setLoading(false); }
  }, []);

  const debouncedSearch = useDebounce(searchCities, 350);

  const handleChange = (e) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSelect = (city) => {
    onSelect({
      city:         city.name,
      country:      city.country,
      countryCode:  city.country_code,
      latitude:     city.latitude,
      longitude:    city.longitude,
      locationLabel: `${city.name}, ${city.country}`,
    });
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode with Open-Meteo
          const res  = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&count=1&language=en&format=json`
          );
          // Open-Meteo doesn't do reverse geocode — use Nominatim (free)
          const nom  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await nom.json();
          const addr = data.address;
          onSelect({
            city:          addr.city || addr.town || addr.village || addr.county || '',
            country:       addr.country || '',
            countryCode:   addr.country_code?.toUpperCase() || '',
            latitude:      pos.coords.latitude,
            longitude:     pos.coords.longitude,
            locationLabel: `${addr.city || addr.town || ''}, ${addr.country || ''}`,
          });
        } catch {
          // Fallback: just save coordinates without city name
          onSelect({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, locationLabel: 'Current location' });
        } finally { setGeoLoading(false); }
      },
      () => { setGeoLoading(false); setError('Could not get GPS location.'); }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onClose} className="p-1">
          <X size={22} className="tg-text" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface)' }}>
          <Search size={16} className="text-gray-500 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search city…"
            className="flex-1 bg-transparent outline-none text-sm tg-text"
          />
          {loading && <Loader size={14} className="text-gray-500 animate-spin flex-shrink-0" />}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults([]); }}>
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* GPS button */}
      <button
        onClick={handleGPS}
        disabled={geoLoading}
        className="flex items-center gap-3 px-5 py-4 border-b transition-opacity disabled:opacity-50"
        style={{ borderColor: 'var(--border)' }}>
        {geoLoading
          ? <Loader size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
          : <MapPin size={18} style={{ color: 'var(--brand)' }} />}
        <span className="text-sm font-medium tg-text">Use my current location</span>
      </button>

      {/* Error */}
      {error && (
        <p className="px-5 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {results.length === 0 && query.length >= 2 && !loading && (
          <p className="px-5 py-6 text-sm tg-hint text-center">No cities found. Try a different spelling.</p>
        )}
        {results.map((city, i) => (
          <button
            key={`${city.name}-${i}`}
            onClick={() => handleSelect(city)}
            className="w-full flex items-center gap-3 px-5 py-4 border-b text-left"
            style={{ borderColor: 'var(--border)' }}>
            <MapPin size={16} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium tg-text">{city.name}</p>
              <p className="text-xs tg-hint">
                {[city.admin1, city.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
