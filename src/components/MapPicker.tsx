import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, LocateFixed, Search, Crosshair, Link } from "lucide-react";

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

/** Parse lat/lng from a pasted Google Maps URL or raw "lat,lng" string */
function parseLocationInput(raw: string): { lat: number; lng: number } | null {
  const text = raw.trim();

  // Raw coordinates: "12.9716, 77.5946" or "12.9716 77.5946"
  const coordMatch = text.match(/^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }

  // Google Maps URL patterns:
  // https://maps.google.com/?q=12.9716,77.5946
  // https://www.google.com/maps/place/.../@12.9716,77.5946,...
  // https://maps.app.goo.gl/... (short URL — can't parse without redirect)
  const qMatch = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  const placeMatch = text.match(/\/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

  return null;
}

export function MapPicker({
  open,
  onOpenChange,
  onConfirm,
  initialLat = 13.0827,
  initialLng = 80.2707,
}: MapPickerProps) {
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [showPasteBar, setShowPasteBar] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    if (open && !position) {
      handleCurrentLocation();
    }
    if (!open) {
      setPasteInput("");
      setPasteError("");
      setShowPasteBar(false);
    }
  }, [open]);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          map?.panTo(newPos);
          map?.setZoom(16);
        },
        () => {
          if (!position) setPosition({ lat: initialLat, lng: initialLng });
        }
      );
    } else if (!position) {
      setPosition({ lat: initialLat, lng: initialLng });
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  }, []);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setPosition(newPos);
        map?.panTo(newPos);
        map?.setZoom(17);
      }
    }
  };

  /** Place pin at the exact center of the current map view */
  const handlePinAtCenter = () => {
    if (map) {
      const center = map.getCenter();
      if (center) setPosition({ lat: center.lat(), lng: center.lng() });
    }
  };

  /** Handle paste URL / coordinates input */
  const handlePasteGo = () => {
    const parsed = parseLocationInput(pasteInput);
    if (parsed) {
      setPosition(parsed);
      map?.panTo(parsed);
      map?.setZoom(17);
      setPasteInput("");
      setPasteError("");
      setShowPasteBar(false);
    } else {
      setPasteError("Couldn't read location. Paste a Google Maps link or coordinates like: 13.08, 80.27");
    }
  };

  const handleConfirm = () => {
    if (position) {
      const googleMapsUrl = `https://www.google.com/maps/place/${position.lat},${position.lng}`;
      onConfirm(googleMapsUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-xl h-[85vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Pick Location</DialogTitle>
          <DialogDescription>
            Search, paste a Google Maps link, or tap the map to drop a pin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 w-full bg-muted/50 relative z-0">
          {loadError ? (
            <div className="h-full w-full flex items-center justify-center p-4 text-center">
              <span className="text-sm text-destructive">Error loading Google Maps. Please check your API key.</span>
            </div>
          ) : !isLoaded || !position ? (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">Loading map...</span>
            </div>
          ) : (
            <>
              {/* Search Box Overlay */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
                <div className="flex-1 relative bg-background rounded-xl shadow-md border focus-within:ring-2 focus-within:ring-primary/40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Autocomplete
                    onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search a place..."
                      className="w-full h-10 pl-9 pr-3 bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground"
                    />
                  </Autocomplete>
                </div>
                {/* Paste Link Button */}
                <button
                  onClick={() => { setShowPasteBar((v) => !v); setPasteError(""); }}
                  title="Paste Google Maps link or coordinates"
                  className="h-10 w-10 shrink-0 rounded-xl bg-background border shadow-md flex items-center justify-center hover:bg-secondary transition active:scale-95"
                >
                  <Link className="size-4 text-primary" />
                </button>
              </div>

              {/* Paste URL / Coordinates Bar */}
              {showPasteBar && (
                <div className="absolute top-16 left-3 right-3 z-10 bg-background border rounded-xl shadow-lg p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Paste a Google Maps link or coordinates (e.g. <span className="font-mono">13.08, 80.27</span>)
                  </p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={pasteInput}
                      onChange={(e) => { setPasteInput(e.target.value); setPasteError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handlePasteGo()}
                      placeholder="Paste link or lat, lng..."
                      className="flex-1 h-9 px-3 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handlePasteGo}
                      className="h-9 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg active:scale-95 transition"
                    >
                      Go
                    </button>
                  </div>
                  {pasteError && (
                    <p className="text-[11px] text-destructive">{pasteError}</p>
                  )}
                </div>
              )}

              {/* Bottom right controls */}
              <div className="absolute bottom-6 right-3 z-10 flex flex-col gap-2">
                {/* Pin at center button */}
                <button
                  onClick={handlePinAtCenter}
                  title="Drop pin at center of map"
                  className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition active:scale-95"
                >
                  <Crosshair className="size-5" />
                </button>
                {/* Current location */}
                <button
                  onClick={handleCurrentLocation}
                  title="My current location"
                  className="h-12 w-12 rounded-full bg-background shadow-lg border flex items-center justify-center hover:bg-secondary transition active:scale-95"
                >
                  <LocateFixed className="size-5 text-primary" />
                </button>
              </div>

              {/* Drag hint */}
              {position && (
                <div className="absolute bottom-6 left-3 z-10 bg-black/60 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">
                  Drag pin · tap map · or use 🎯
                </div>
              )}

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={position}
                zoom={15}
                onClick={handleMapClick}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  gestureHandling: "greedy",
                }}
              >
                <Marker
                  position={position}
                  draggable={true}
                  animation={2} // DROP animation when pin is placed
                  onDragEnd={(e) => {
                    if (e.latLng) {
                      setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    }
                  }}
                />
              </GoogleMap>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 shrink-0 border-t space-y-2">
          {position && (
            <p className="text-[10px] text-center text-muted-foreground font-mono tabular-nums">
              📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!position} onClick={handleConfirm}>
              <MapPin className="size-4" /> Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
