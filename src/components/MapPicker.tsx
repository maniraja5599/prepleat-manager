import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, LocateFixed, Search } from "lucide-react";

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export function MapPicker({
  open,
  onOpenChange,
  onConfirm,
  initialLat = 13.0827, // Default to Chennai
  initialLng = 80.2707,
}: MapPickerProps) {
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Ask for geolocation when opened if no position is set
  useEffect(() => {
    if (open && !position) {
      handleCurrentLocation();
    }
  }, [open, position]);

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
          // Silently fallback to default Chennai on error if not set yet
          if (!position) {
            setPosition({ lat: initialLat, lng: initialLng });
          }
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
        map?.setZoom(16);
      }
    }
  };

  const handleConfirm = () => {
    if (position) {
      // Generate a Google Maps URL for the chosen coordinates
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
            Search or tap on the map to place a pin at the exact location.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 w-full bg-muted/50 relative z-0">
          {loadError ? (
            <div className="h-full w-full flex items-center justify-center p-4 text-center">
              <span className="text-sm text-destructive">Error loading Google Maps. Please check your API key and connection.</span>
            </div>
          ) : !isLoaded || !position ? (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">Loading map...</span>
            </div>
          ) : (
            <>
              {/* Search Box Overlay */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
                <div className="flex-1 relative bg-background rounded-md shadow-md border focus-within:ring-2 focus-within:ring-primary/40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Autocomplete
                    onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input 
                      type="text" 
                      placeholder="Search for a place..." 
                      className="w-full h-10 pl-9 pr-3 bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground"
                    />
                  </Autocomplete>
                </div>
              </div>

              {/* Current Location Button Overlay */}
              <div className="absolute bottom-6 right-3 z-10">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full shadow-lg bg-background hover:bg-background/90 h-12 w-12"
                  onClick={handleCurrentLocation}
                >
                  <LocateFixed className="size-5 text-primary" />
                </Button>
              </div>

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={position}
                zoom={14}
                onClick={handleMapClick}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                <Marker
                  position={position}
                  draggable={true}
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

        <DialogFooter className="p-4 pt-3 shrink-0 flex-row justify-between sm:justify-end gap-3 border-t">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 sm:flex-none" disabled={!position} onClick={handleConfirm}>
            <MapPin className="size-4 mr-2" /> Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
