import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  lat: number;
  lng: number;
  color: string;   // hex
  label: string;
  pulse?: boolean;
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  style?: any;
}

export default function RidenMap({ center, zoom = 14, markers = [], style }: Props) {
  const html = useMemo(() => buildHtml(center, zoom, markers), [
    center.lat, center.lng, zoom, JSON.stringify(markers),
  ]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

function buildHtml(center: { lat: number; lng: number }, zoom: number, markers: Marker[]) {
  const markersJs = markers.map((m, i) => {
    const pulseStyle = m.pulse
      ? `<style>
          @keyframes pulse${i} {
            0%   { transform: scale(1); opacity: 1; }
            50%  { transform: scale(1.4); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pulse${i} { animation: pulse${i} 1.5s infinite; }
        </style>`
      : '';

    return `
      ${pulseStyle}
      (function() {
        var el = document.createElement('div');
        el.innerHTML = \`
          <div style="position:relative;text-align:center;">
            ${m.pulse ? `<div class="pulse${i}" style="` : '<div style="'}
              width:20px;height:20px;background:${m.color};
              border-radius:50%;border:3px solid #fff;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
              margin:auto;
            "></div>
            <div style="
              background:${m.color};color:#fff;
              font-size:11px;font-weight:700;
              padding:3px 8px;border-radius:8px;
              margin-top:4px;white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">${m.label}</div>
          </div>
        \`;
        var icon = L.divIcon({ html: el.innerHTML, className: '', iconSize: [80, 50], iconAnchor: [40, 20] });
        L.marker([${m.lat}, ${m.lng}], { icon: icon }).addTo(map);
      })();
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#1a1f2e; }
    .leaflet-control-zoom { display:none; }
    .leaflet-control-attribution { display:none; }
    .leaflet-tile-pane { filter: brightness(0.9) saturate(1.1); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
    }).setView([${center.lat}, ${center.lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    ${markersJs}
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 0 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
