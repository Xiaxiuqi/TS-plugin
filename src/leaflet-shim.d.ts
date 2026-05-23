declare module 'leaflet' {
  export const map: (element: HTMLElement | string, options?: any) => any;
  export const tileLayer: (url: string, options?: any) => any;
  export const marker: (latlng: any, options?: any) => any;
  export const rectangle: (bounds: any, options?: any) => any;
  export const circle: (latlng: any, options?: any) => any;
  export const circleMarker: (latlng: any, options?: any) => any;
  export const latLng: (lat: number, lng: number) => any;
  export const latLngBounds: (southWest: any, northEast: any) => any;
  export const divIcon: (options?: any) => any;
  export const CRS: {
    Simple: any;
  };
  export const DomUtil: {
    create: (tagName: string, className?: string) => HTMLElement;
  };
  export const DomEvent: {
    stopPropagation: (e: any) => void;
    disableClickPropagation: (el: HTMLElement) => void;
  };
  export const Control: any;

  export interface Map {
    addTo(map: any): this;
    remove(): this;
    fitBounds(bounds: any): this;
    eachLayer(fn: (layer: any) => void): this;
    removeLayer(layer: any): this;
  }
}
