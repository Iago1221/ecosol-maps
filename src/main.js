import L from "leaflet";
import "./style.css";

const BRAZIL_CENTER = [-14.235, -51.9253];
const BRAZIL_ZOOM = 4;
const BORDER_COLOR = "#94a3b8";
const DEFAULT_COLOR = "#1a5276";

let map = null;
let choroplethLayer = null;
let currentMapData = null;
let selectedLayer = null;
let openMunicipio = null;
let municipiosGeo = null;
let municipioByIbge = new Map();
let currentMin = 0;
let currentMax = 0;
let selectedBaseColor = DEFAULT_COLOR;

const detailsPanel = () => document.getElementById("details-panel");
const detailsContent = () => document.getElementById("details-content");
const detailsTitle = () => document.getElementById("details-title");
const detailsBackdrop = () => document.getElementById("details-backdrop");

function initMap() {
  map = L.map("map", {
    center: BRAZIL_CENTER,
    zoom: BRAZIL_ZOOM,
    minZoom: 3,
    maxZoom: 12,
  });

  const ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });

  const sateliteImagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, IGP, and the GIS User Community",
      maxZoom: 19,
    }
  );

  const sateliteLabels = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Labels &copy; Esri",
      maxZoom: 19,
      pane: "overlayPane",
    }
  );

  const satelite = L.layerGroup([sateliteImagery, sateliteLabels]);

  const liso = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  );

  ruas.addTo(map);

  L.control
    .layers(
      { Ruas: ruas, Liso: liso, Satélite: satelite },
      null,
      { position: "topright" }
    )
    .addTo(map);

  choroplethLayer = L.geoJSON(null, {
    style: () => defaultPolygonStyle(),
  }).addTo(map);

  window.addEventListener("resize", () => map.invalidateSize());
  setupDetailsPanel();
}

function defaultPolygonStyle(selected = false) {
  return {
    weight: selected ? 2.5 : 0.6,
    color: selected ? selectedBaseColor : BORDER_COLOR,
    opacity: selected ? 1 : 0.85,
    fillOpacity: 0.78,
  };
}

function closeDetails() {
  const panel = detailsPanel();
  const backdrop = detailsBackdrop();
  if (panel) {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.setAttribute("aria-hidden", "true");
  }
  if (selectedLayer) {
    const style = selectedLayer._baseStyle ?? defaultPolygonStyle();
    selectedLayer.setStyle(style);
    selectedLayer = null;
  }
  openMunicipio = null;
}

function openDetails(municipio, color) {
  const panel = detailsPanel();
  const content = detailsContent();
  const title = detailsTitle();
  if (!panel || !content) return;

  if (selectedLayer) {
    const prevStyle = selectedLayer._baseStyle ?? defaultPolygonStyle();
    selectedLayer.setStyle(prevStyle);
  }

  selectedLayer = municipio._layer;
  openMunicipio = municipio;
  if (selectedLayer) {
    selectedLayer.setStyle({
      ...defaultPolygonStyle(true),
      fillColor: color,
    });
    selectedLayer.bringToFront();
  }

  title.textContent = `${municipio.nome} — ${municipio.uf}`;

  const rows = [
    ["Município", `${municipio.nome} — ${municipio.uf}`],
    ["Quantidade de EES", municipio.valor],
    ["Código IBGE", municipio.codigo_ibge ?? "—"],
    [
      "Coordenadas",
      municipio.latitude != null
        ? `${municipio.latitude.toFixed(4)}, ${municipio.longitude.toFixed(4)}`
        : "—",
    ],
  ];

  if (currentMapData) {
    rows.push(["Mapa / ano", `${currentMapData.titulo} (${currentMapData.ano})`]);
  }

  content.innerHTML = `
    <div class="details-swatch" style="background:${color}"></div>
    <dl class="details-list">
      ${rows
        .map(
          ([label, value]) => `
        <div class="details-row">
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>`
        )
        .join("")}
    </dl>
  `;

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");

  const backdrop = detailsBackdrop();
  if (backdrop) {
    backdrop.classList.add("is-visible");
    backdrop.setAttribute("aria-hidden", "false");
  }
}

function setupDetailsPanel() {
  document.getElementById("details-close")?.addEventListener("click", closeDetails);
  detailsBackdrop()?.addEventListener("click", closeDetails);
  map.on("click", () => closeDetails());
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 26, g: 82, b: 118 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function getColorScale(min, max, baseHex = DEFAULT_COLOR) {
  const { r, g, b } = hexToRgb(baseHex);
  const lightMix = 0.78;

  return (value) => {
    if (max === min) return baseHex;
    const t = (value - min) / (max - min);
    const factor = lightMix * (1 - t);
    const rr = Math.round(r + (255 - r) * factor);
    const gg = Math.round(g + (255 - g) * factor);
    const bb = Math.round(b + (255 - b) * factor);
    return `rgb(${rr}, ${gg}, ${bb})`;
  };
}

function getCurrentColor(value) {
  return getColorScale(currentMin, currentMax, selectedBaseColor)(value);
}

function updateDetailsSwatch(color) {
  const swatch = detailsContent()?.querySelector(".details-swatch");
  if (swatch) swatch.style.background = color;
}

function refreshMapColors() {
  if (!currentMapData) return;

  const getColor = (value) => getCurrentColor(value);

  choroplethLayer.eachLayer((layer) => {
    const ibge = layer.feature.properties.codigo_ibge;
    const municipio = municipioByIbge.get(ibge);
    if (!municipio) return;

    const color = getColor(municipio.valor);
    const style = {
      ...defaultPolygonStyle(false),
      fillColor: color,
    };

    layer._baseStyle = style;
    layer.setStyle(
      layer === selectedLayer
        ? { ...defaultPolygonStyle(true), fillColor: color }
        : style
    );
  });

  if (selectedLayer && openMunicipio) {
    const color = getColor(openMunicipio.valor);
    selectedLayer.setStyle({
      ...defaultPolygonStyle(true),
      fillColor: color,
    });
    updateDetailsSwatch(color);
  }

  renderLegend(currentMin, currentMax, getColor);
}

function renderLegend(min, max, getColor) {
  const legend = document.getElementById("legend");
  const steps = 5;
  const items = [];

  for (let i = 0; i <= steps; i++) {
    const value = min + ((max - min) * i) / steps;
    const label = i === 0 ? min : i === steps ? max : Math.round(value);
    items.push(`
      <div class="legend-item">
        <span class="legend-color" style="background:${getColor(value)}"></span>
        <span>${label}</span>
      </div>
    `);
  }

  legend.innerHTML = `
    <h3>Quantidade de EES</h3>
    <div class="legend-scale">${items.join("")}</div>
    <p class="legend-note">Cor mais escura = valor maior</p>
  `;
}

function renderInfo(mapData) {
  const info = document.getElementById("info");
  info.innerHTML = `
    <strong>${mapData.titulo}</strong>
    <span>${mapData.totalGeocodificados ?? mapData.totalMunicipios} municípios exibidos</span>
  `;
}

async function loadMunicipiosGeo() {
  if (municipiosGeo) return municipiosGeo;

  const res = await fetch(`${import.meta.env.BASE_URL}data/geo/municipios-br.geojson`);
  if (!res.ok) {
    throw new Error("Não foi possível carregar as fronteiras municipais");
  }

  municipiosGeo = await res.json();
  return municipiosGeo;
}

function renderMapData(mapData) {
  currentMapData = mapData;
  closeDetails();
  choroplethLayer.clearLayers();

  municipioByIbge = new Map(
    mapData.municipios
      .filter((m) => m.codigo_ibge != null)
      .map((m) => [m.codigo_ibge, m])
  );

  const valores = mapData.municipios.map((m) => m.valor);
  currentMin = Math.min(...valores);
  currentMax = Math.max(...valores);
  const getColor = (value) => getCurrentColor(value);

  const features = municipiosGeo.features.filter((feature) =>
    municipioByIbge.has(feature.properties.codigo_ibge)
  );

  const geoData = { type: "FeatureCollection", features };

  choroplethLayer.addData(geoData);

  choroplethLayer.eachLayer((layer) => {
    const ibge = layer.feature.properties.codigo_ibge;
    const municipio = municipioByIbge.get(ibge);
    if (!municipio) return;

    const color = getColor(municipio.valor);
    const style = {
      ...defaultPolygonStyle(),
      fillColor: color,
    };

    layer.setStyle(style);
    layer._baseStyle = style;
    municipio._layer = layer;

    layer.bindTooltip(
      `<strong>${municipio.nome} - ${municipio.uf}</strong><br/>EES: ${municipio.valor}`,
      { sticky: true, opacity: 0.95 }
    );

    layer.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      openDetails(municipio, getCurrentColor(municipio.valor));
    });
  });

  if (features.length > 0) {
    map.fitBounds(choroplethLayer.getBounds(), { padding: [40, 40], maxZoom: 6 });
  } else {
    map.setView(BRAZIL_CENTER, BRAZIL_ZOOM);
  }

  renderLegend(currentMin, currentMax, getColor);
  renderInfo(mapData);
}

function setupColorSelect() {
  const input = document.getElementById("color-select");
  if (!input) return;

  input.value = selectedBaseColor;
  input.addEventListener("input", () => {
    selectedBaseColor = input.value;
    refreshMapColors();
  });
}

async function loadMapIndex() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/maps-index.json`);
  if (!res.ok) throw new Error("Não foi possível carregar o índice de mapas");
  return res.json();
}

async function loadMapData(arquivo) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/maps/${arquivo}`);
  if (!res.ok) throw new Error(`Não foi possível carregar ${arquivo}`);
  return res.json();
}

async function setupMapSelect(mapas) {
  const select = document.getElementById("map-select");
  select.innerHTML = "";

  for (const m of mapas) {
    const option = document.createElement("option");
    option.value = m.arquivo;
    option.textContent = m.titulo;
    option.dataset.id = m.id;
    select.appendChild(option);
  }

  select.addEventListener("change", async () => {
    const arquivo = select.value;
    const mapData = await loadMapData(arquivo);
    renderMapData(mapData);
  });

  if (mapas.length > 0) {
    const mapData = await loadMapData(mapas[0].arquivo);
    renderMapData(mapData);
  }
}

async function main() {
  initMap();
  setupColorSelect();

  try {
    await loadMunicipiosGeo();
    const index = await loadMapIndex();
    await setupMapSelect(index.mapas);
  } catch (err) {
    console.error(err);
    document.getElementById("info").textContent =
      "Erro ao carregar dados. Execute: npm run data:build";
  }
}

main();
