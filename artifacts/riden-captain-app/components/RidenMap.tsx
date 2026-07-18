import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  pulse?: boolean;
  isVehicle?: boolean;
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  style?: any;
}

export default function RidenMap({ center, zoom = 14, markers = [], style }: Props) {
  const webviewRef  = useRef<WebView>(null);
  const readyRef    = useRef(false);
  const prevMarkRef = useRef('');
  const prevCentRef = useRef('');

  const html = buildHtml();

  // تحديث المؤشرات بدون إعادة تحميل
  useEffect(() => {
    if (!readyRef.current) return;
    const key = JSON.stringify(markers);
    if (prevMarkRef.current === key) return;
    prevMarkRef.current = key;
    webviewRef.current?.injectJavaScript(`updateMarkers(${JSON.stringify(markers)});true;`);
  }, [JSON.stringify(markers)]);

  // تحديث المركز بانسيابية
  useEffect(() => {
    if (!readyRef.current) return;
    const key = `${center.lat},${center.lng},${zoom}`;
    if (prevCentRef.current === key) return;
    prevCentRef.current = key;
    webviewRef.current?.injectJavaScript(
      `map.setView([${center.lat},${center.lng}],${zoom},{animate:true,duration:0.8});true;`
    );
  }, [center.lat, center.lng, zoom]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        androidLayerType="hardware"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') {
              readyRef.current = true;
              webviewRef.current?.injectJavaScript(
                `map.setView([${center.lat},${center.lng}],${zoom});updateMarkers(${JSON.stringify(markers)});true;`
              );
            }
          } catch { /* ignore */ }
        }}
      />
    </View>
  );
}

function buildHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#map{width:100%;height:100%;background:#1a1f2e;}
    .leaflet-control-zoom,.leaflet-control-attribution{display:none;}
    .leaflet-tile-pane{filter:brightness(0.9) saturate(1.1);}
    @keyframes pulseRing{
      0%  {transform:scale(1);  opacity:1;}
      50% {transform:scale(1.5);opacity:0.5;}
      100%{transform:scale(1);  opacity:1;}
    }
    .pulse-dot{animation:pulseRing 1.4s infinite;}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map',{zoomControl:false,attributionControl:false,dragging:true,touchZoom:true})
               .setView([31.9539,35.9106],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

    var _markers = {};

    function makeIcon(m) {
      var inner = m.isVehicle
        ? '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.55));">'+m.label+'</div>'
        : '<div class="'+(m.pulse?'pulse-dot':'')+'" style="width:18px;height:18px;background:'+m.color+';border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);margin:auto;"></div>'
          +'<div style="background:'+m.color+';color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;margin-top:3px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.3);text-align:center;">'+m.label+'</div>';
      return L.divIcon({
        html:'<div style="text-align:center;">'+inner+'</div>',
        className:'',
        iconSize:  m.isVehicle?[36,36]:[80,48],
        iconAnchor:m.isVehicle?[18,18]:[40,18],
      });
    }

    function updateMarkers(list) {
      var newIds = list.map(function(m){return m.id;});
      Object.keys(_markers).forEach(function(id){
        if(!newIds.includes(id)){map.removeLayer(_markers[id]);delete _markers[id];}
      });
      list.forEach(function(m){
        var icon = makeIcon(m);
        if(_markers[m.id]){
          _markers[m.id].setLatLng([m.lat,m.lng]);
          _markers[m.id].setIcon(icon);
        } else {
          _markers[m.id] = L.marker([m.lat,m.lng],{icon:icon}).addTo(map);
        }
      });
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: 'transparent' },
});
