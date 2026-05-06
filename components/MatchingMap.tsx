import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

export interface MapMarker {
  id: string;
  org: string;
  title: string;
  lat: number;
  lng: number;
  status: "pending" | "matched" | "completed";
}

interface Props {
  markers: MapMarker[];
}

/* ── 마커 상태별 설정 ─────────────────────────────────────── */
const CFG: Record<
  MapMarker["status"],
  { color: string; glow: string; emoji: string; label: string; labelBg: string }
> = {
  pending:   { color: "#0066CC", glow: "rgba(0,102,204,0.45)",   emoji: "🔔", label: "신청 대기", labelBg: "#e0edff" },
  matched:   { color: "#16a34a", glow: "rgba(22,163,74,0.40)",   emoji: "✅", label: "수락 완료", labelBg: "#dcfce7" },
  completed: { color: "#6b7280", glow: "rgba(107,114,128,0.30)", emoji: "📚", label: "강의 완료", labelBg: "#f3f4f6" },
};

/* ── 화성시 권역 (simplified administrative zones) ─────────── */
type LatLng = [number, number];
interface Zone {
  name: string;
  color: string;
  bounds: LatLng[];
  labelPos: LatLng;
}

const ZONES: Zone[] = [
  {
    name: "동탄 권역",
    color: "#1d4ed8",
    bounds: [
      [37.183, 127.022], [37.185, 127.114], [37.250, 127.112],
      [37.252, 127.022],
    ],
    labelPos: [37.218, 127.067],
  },
  {
    name: "화성·장안 권역",
    color: "#7c3aed",
    bounds: [
      [37.153, 126.952], [37.155, 127.022], [37.242, 127.020],
      [37.240, 126.950],
    ],
    labelPos: [37.198, 126.986],
  },
  {
    name: "팔탄·정남 권역",
    color: "#b45309",
    bounds: [
      [37.090, 126.920], [37.092, 127.022], [37.155, 127.020],
      [37.153, 126.920],
    ],
    labelPos: [37.122, 126.970],
  },
  {
    name: "봉담·매송 권역",
    color: "#15803d",
    bounds: [
      [37.028, 126.870], [37.030, 126.958], [37.105, 126.955],
      [37.103, 126.870],
    ],
    labelPos: [37.066, 126.912],
  },
  {
    name: "향남·우정 권역",
    color: "#c2410c",
    bounds: [
      [37.016, 126.758], [37.018, 126.872], [37.108, 126.870],
      [37.106, 126.758],
    ],
    labelPos: [37.062, 126.814],
  },
  {
    name: "남양·마도 권역",
    color: "#0e7490",
    bounds: [
      [37.153, 126.758], [37.155, 126.924], [37.305, 126.922],
      [37.303, 126.758],
    ],
    labelPos: [37.229, 126.840],
  },
];

/* ── 팝업 HTML ────────────────────────────────────────────── */
function buildPopup(m: MapMarker): string {
  const c = CFG[m.status];
  return (
    `<div style="font-family:'Noto Sans KR',Arial,sans-serif;min-width:180px;overflow:hidden;">` +
    `<div style="background:${c.color};padding:10px 12px 8px;">` +
    `<p style="font-size:13px;font-weight:700;color:white;margin:0 0 2px;">${m.org}</p>` +
    `<p style="font-size:11px;color:rgba(255,255,255,0.82);margin:0;">${m.title}</p>` +
    `</div>` +
    `<div style="padding:10px 12px;">` +
    `<span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${c.labelBg};color:${c.color};">` +
    `${c.emoji} ${c.label}</span>` +
    `</div></div>`
  );
}

/* ── 마커 아이콘 ──────────────────────────────────────────── */
function buildIcon(m: MapMarker): L.DivIcon {
  const c         = CFG[m.status];
  const isPending = m.status === "pending";

  return L.divIcon({
    html: `
      <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
        ${isPending ? `
          <div class="map-ping" style="position:absolute;inset:2px;border-radius:50%;border:3px solid ${c.color};opacity:0.7;"></div>
          <div class="map-ping" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${c.color};opacity:0.45;animation-delay:0.65s;"></div>
        ` : ""}
        <div style="position:absolute;width:50px;height:50px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color}66;"></div>
        <div style="
          width:40px;height:40px;border-radius:50%;
          background:${c.color};
          border:3px solid white;
          box-shadow:0 4px 18px ${c.glow},0 2px 6px rgba(0,0,0,0.18);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;line-height:1;
          position:relative;z-index:1;
        ">${c.emoji}</div>
      </div>`,
    className:   "",
    iconSize:    [64, 64],
    iconAnchor:  [32, 32],
    popupAnchor: [0, -36],
  });
}

/* ── 메인 컴포넌트 ────────────────────────────────────────── */
export default function MatchingMap({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:          [37.1997, 126.98],
      zoom:            11,
      zoomControl:     false,
      scrollWheelZoom: false,
    });

    /* CartoDB Voyager — 현대적 컬러 지도 타일 */
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> © <a href='https://carto.com/'>CARTO</a>",
        subdomains:   "abcd",
        maxZoom:      19,
        detectRetina: true,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    /* ── 권역 폴리곤 레이어 ── */
    ZONES.forEach((zone) => {
      /* 채움 폴리곤 */
      L.polygon(zone.bounds, {
        color:       zone.color,
        weight:      2.5,
        dashArray:   "7, 5",
        fillColor:   zone.color,
        fillOpacity: 0.10,
        opacity:     0.75,
        interactive: false,
      }).addTo(map);

      /* 권역 이름 라벨 */
      L.marker(zone.labelPos, {
        interactive: false,
        keyboard:    false,
        icon: L.divIcon({
          html: `
            <div style="
              background:${zone.color}e8;
              color:white;
              font-family:'Noto Sans KR',sans-serif;
              font-size:11px;font-weight:700;
              padding:3px 10px;
              border-radius:12px;
              white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.22);
              letter-spacing:-0.2px;
              border:1.5px solid ${zone.color};
            ">${zone.name}</div>`,
          className:  "",
          iconSize:   [130, 24],
          iconAnchor: [65, 12],
        }),
      }).addTo(map);
    });

    /* ── 강의 마커 (폴리곤 위에 렌더링) ── */
    markers.forEach((m) => {
      L.marker([m.lat, m.lng], { icon: buildIcon(m) })
        .addTo(map)
        .bindPopup(buildPopup(m), { maxWidth: 240, className: "custom-popup" });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
