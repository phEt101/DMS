import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Map as LeafletMap } from "leaflet";
import { FaLocationCrosshairs, FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet/dist/leaflet.css";

interface PmLocationPickerProps {
  latitude: string;
  longitude: string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
}

interface SearchResultItem {
  x: number;
  y: number;
  label: string;
}

const DEFAULT_CENTER = {
  latitude: "13.7563",
  longitude: "100.5018",
};

const DEFAULT_ZOOM = 15;

const pmMarkerIcon = L.divIcon({
  className: "dms-pm-map-marker",
  html: "<span class=\"dms-pm-map-marker-pin\"></span>",
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function parseCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function MapCenterSync({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), DEFAULT_ZOOM), {
      animate: true,
      duration: 0.8,
    });
  }, [center, map]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (coords: { latitude: string; longitude: string }) => void;
}) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: event.latlng.lat.toFixed(6),
        longitude: event.latlng.lng.toFixed(6),
      });
    },
  });

  return null;
}

function MapBridge({
  onReady,
}: {
  onReady: (map: LeafletMap) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

export function PmLocationPicker({
  latitude,
  longitude,
  onChange,
}: PmLocationPickerProps) {
  const provider = useMemo(() => new OpenStreetMapProvider(), []);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const parsedLatitude = parseCoordinate(latitude);
  const parsedLongitude = parseCoordinate(longitude);

  const center = useMemo<[number, number]>(() => {
    if (parsedLatitude !== null && parsedLongitude !== null) {
      return [parsedLatitude, parsedLongitude];
    }
    return [Number.parseFloat(DEFAULT_CENTER.latitude), Number.parseFloat(DEFAULT_CENTER.longitude)];
  }, [parsedLatitude, parsedLongitude]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setIsResultsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setIsSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(async () => {
      try {
        const nextResults = (await provider.search({ query: trimmedQuery })) as SearchResultItem[];
        if (requestIdRef.current !== currentRequestId) return;
        setResults(nextResults.slice(0, 5));
        setIsResultsOpen(true);
        if (nextResults.length === 0) {
          setSearchError("ไม่พบสถานที่ที่ค้นหา");
        }
      } catch {
        if (requestIdRef.current !== currentRequestId) return;
        setResults([]);
        setSearchError("ค้นหาสถานที่ไม่สำเร็จ");
        setIsResultsOpen(true);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [provider, query]);

  function selectSearchResult(result: SearchResultItem) {
    const nextLatitude = result.y.toFixed(6);
    const nextLongitude = result.x.toFixed(6);

    setQuery(result.label);
    setIsResultsOpen(false);
    setSearchError(null);
    onChange({
      latitude: nextLatitude,
      longitude: nextLongitude,
    });

    map?.flyTo([result.y, result.x], Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.8,
    });
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSearchError(null);
    setIsResultsOpen(false);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      selectSearchResult(results[0]);
    }
  }

  return (
    <div className="dms-pm-map-shell" ref={shellRef}>
      <div className="dms-pm-map-frame">
        <div className="dms-pm-map-search-overlay">
          <div className="dms-pm-map-search-box">
            <FaMagnifyingGlass className="dms-pm-map-search-icon" />
            <input
              type="text"
              className="dms-pm-map-search-input"
              placeholder="ค้นหาสถานที่บนแผนที่"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (results.length > 0 || searchError) {
                  setIsResultsOpen(true);
                }
              }}
              onKeyDown={handleQueryKeyDown}
            />
            {query ? (
              <button
                type="button"
                className="dms-pm-map-search-clear"
                onClick={clearSearch}
                aria-label="ล้างคำค้นหา"
              >
                <FaXmark />
              </button>
            ) : null}
          </div>

          {(isResultsOpen || isSearching) && (results.length > 0 || searchError || query.trim().length >= 2) ? (
            <div className="dms-pm-map-search-results">
              {isSearching ? <div className="dms-pm-map-search-state">กำลังค้นหาสถานที่...</div> : null}
              {!isSearching && searchError ? (
                <div className="dms-pm-map-search-state is-error">{searchError}</div>
              ) : null}
              {!isSearching && !searchError && results.length === 0 ? (
                <div className="dms-pm-map-search-state">ไม่พบสถานที่ที่ค้นหา</div>
              ) : null}
              {!isSearching && results.length > 0 ? (
                <div className="dms-pm-map-search-list">
                  {results.map((result) => (
                    <button
                      key={`${result.x}-${result.y}-${result.label}`}
                      type="button"
                      className="dms-pm-map-search-item"
                      onClick={() => selectSearchResult(result)}
                    >
                      <FaLocationCrosshairs className="dms-pm-map-search-item-icon" />
                      <span>{result.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="dms-pm-map-canvas"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={pmMarkerIcon} />
            <MapBridge onReady={setMap} />
          <MapCenterSync center={center} />
          <MapClickHandler onPick={onChange} />
        </MapContainer>
      </div>
    </div>
  );
}
