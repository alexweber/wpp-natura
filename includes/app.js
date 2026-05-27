const staffDataUrl = "assets/staff.json";
const staffPhotoBaseUrl = "assets/photos/";
const defaultStaffPhoto = `${staffPhotoBaseUrl}foto-padrao.png`;
const popupCloseDuration = 260;
const markerColor = "#1c1c1c";
const popupConnectorGap = 84;
const popupConnectorCircleRadius = 12;
const popupConnectorCardCircleInset = 24;
const popupCardWidth = 288;
const popupCardEstimatedHeight = 432;
const popupViewportPadding = 24;
const popupOffset = {
  "top-left": [popupConnectorGap, popupConnectorGap],
  top: [0, popupConnectorGap],
  "top-right": [-popupConnectorGap, popupConnectorGap],
  right: [-popupConnectorGap, 0],
  "bottom-right": [-popupConnectorGap, -popupConnectorGap],
  bottom: [0, -popupConnectorGap],
  "bottom-left": [popupConnectorGap, -popupConnectorGap],
  left: [popupConnectorGap, 0],
};
const worldBounds = [
  [-179.999, -85.051129],
  [179.999, 85.051129],
];
const markerFocusExpression = ["coalesce", ["feature-state", "focus"], 0];
const markerFocusDuration = 180;
const clusterRadiusExpression = [
  "step",
  ["get", "point_count"],
  13,
  4,
  15,
  8,
  17,
];
const interactiveClusterRadiusExpression = [
  "*",
  ["+", 1, ["*", markerFocusExpression, 0.06]],
  clusterRadiusExpression,
];
const interactivePersonRadiusExpression = [
  "+",
  6,
  markerFocusExpression,
];
let activePopup = null;
let activePopupConnector = null;
let activeFeature = null;
let hoveredFeature = null;
const markerFocusAnimations = new Map();
const neutralMapStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-light",
      type: "raster",
      source: "carto-light",
    },
  ],
};

const map = new maplibregl.Map({
  container: "map",
  style: neutralMapStyle,
  center: [12, 18],
  zoom: 2,
  minZoom: 1,
  maxZoom: 9,
  maxBounds: worldBounds,
  renderWorldCopies: false,
  attributionControl: false,
  locale: {
    "AttributionControl.ToggleAttribution": "Alternar atribuição",
    "FullscreenControl.Enter": "Entrar em tela cheia",
    "FullscreenControl.Exit": "Sair da tela cheia",
    "NavigationControl.ZoomIn": "Aproximar",
    "NavigationControl.ZoomOut": "Afastar",
    "Popup.Close": "Fechar janela",
  },
});

localizeMapAccessibility();
initTargetCrosshair();
initPopupConnector();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
map.addControl(new maplibregl.FullscreenControl(), "bottom-right");
map.addControl(
  new maplibregl.AttributionControl({ compact: true }),
  "bottom-left"
);

map.on("load", async () => {
  let staff;

  try {
    staff = await loadStaff();
  } catch (error) {
    console.error(error);
    return;
  }

  map.addSource("staff", {
    type: "geojson",
    data: buildStaffGeoJson(staff),
    cluster: true,
    clusterMaxZoom: 5,
    clusterRadius: 48,
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "staff",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "rgba(255, 255, 255, 0)",
      "circle-opacity": 0,
      "circle-radius": [
        "*",
        ["+", 1, ["*", markerFocusExpression, 0.06]],
        ["*", 0.2, clusterRadiusExpression],
      ],
      "circle-stroke-color": markerColor,
      "circle-stroke-opacity": 0,
      "circle-stroke-width": ["+", 1, markerFocusExpression],
      "circle-translate": [0, -24],
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "staff",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Open Sans Semibold"],
      "text-size": 11,
    },
    paint: {
      "text-color": markerColor,
      "text-opacity": 0,
      "text-translate": [0, -24],
      "text-halo-color": "rgba(253, 253, 253, 0.75)",
      "text-halo-width": ["*", markerFocusExpression, 0.8],
    },
  });

  map.addLayer({
    id: "unclustered-person",
    type: "circle",
    source: "staff",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "rgba(255, 255, 255, 0)",
      "circle-opacity": 0,
      "circle-radius": ["+", 1, markerFocusExpression],
      "circle-stroke-color": markerColor,
      "circle-stroke-opacity": 0,
      "circle-stroke-width": ["+", 1, markerFocusExpression],
      "circle-translate": [0, -24],
    },
  });

  animateMarkersIn();

  map.on("click", "clusters", async (event) => {
    closeActivePopup();

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["clusters"],
    });
    const clusterId = features[0].properties.cluster_id;
    const source = map.getSource("staff");
    const zoom = await source.getClusterExpansionZoom(clusterId);

    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom,
      duration: 650,
    });
  });

  map.on("click", "unclustered-person", (event) => {
    event.preventDefault();
    const feature = event.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const { name, location, job, agency, photo, linkedin } = feature.properties;

    while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    closeActivePopup();
    setActiveFeature(feature);

    const popup = new maplibregl.Popup({
      anchor: getPopupAnchor(event.point),
      closeButton: false,
      closeOnClick: false,
      maxWidth: "288px",
      offset: popupOffset,
    });

    popup
      .setLngLat(coordinates)
      .setHTML(renderPersonCard({ name, location, job, agency, photo, linkedin }))
      .addTo(map);

    activePopup = popup;
    bindPopupCloseAnimation(popup);
    showPopupConnector(popup, coordinates);
  });

  map.on("click", (event) => {
    const clickedPopupOrMarker = map.queryRenderedFeatures(event.point, {
      layers: ["clusters", "unclustered-person"],
    }).length;

    if (clickedPopupOrMarker) {
      return;
    }

    closeActivePopup();
  });

  map.on("mouseenter", "clusters", (event) => {
    setHoveredFeature(event.features[0]);
  });

  map.on("mouseleave", "clusters", () => {
    clearHoveredFeature();
  });

  map.on("mouseenter", "unclustered-person", (event) => {
    setHoveredFeature(event.features[0]);
  });

  map.on("mouseleave", "unclustered-person", () => {
    clearHoveredFeature();
  });
});

async function loadStaff() {
  const response = await fetch(staffDataUrl);

  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${staffDataUrl}: ${response.status}`);
  }

  const staff = await response.json();

  if (!Array.isArray(staff)) {
    throw new Error(`${staffDataUrl} deve conter um array JSON`);
  }

  return staff;
}

function buildStaffGeoJson(staff) {
  return {
    type: "FeatureCollection",
    features: staff.map((person, index) => ({
      type: "Feature",
      id: index,
      geometry: {
        type: "Point",
        coordinates: person.coordinates,
      },
      properties: {
        name: person.name,
        location: person.location,
        country: person.country,
        region: person.region,
        job: person.job,
        agency: person.agency || "",
        photo: resolveStaffPhotoUrl(person.photo),
        linkedin: person.linkedin || "",
      },
    })),
  };
}

function setHoveredFeature(feature) {
  if (!feature || feature.id === undefined) {
    return;
  }

  clearHoveredFeature();
  hoveredFeature = feature.id;
  animateMarkerFocus(hoveredFeature, 1);
}

function clearHoveredFeature() {
  if (hoveredFeature === null) {
    return;
  }

  if (hoveredFeature !== activeFeature) {
    animateMarkerFocus(hoveredFeature, 0);
  }
  hoveredFeature = null;
}

function setActiveFeature(feature) {
  if (!feature || feature.id === undefined) {
    return;
  }

  clearActiveFeature();
  activeFeature = feature.id;
  animateMarkerFocus(activeFeature, 1);
}

function clearActiveFeature() {
  if (activeFeature === null) {
    return;
  }

  if (activeFeature !== hoveredFeature) {
    animateMarkerFocus(activeFeature, 0);
  }
  activeFeature = null;
}

function animateMarkerFocus(featureId, target) {
  const state = map.getFeatureState({
    source: "staff",
    id: featureId,
  });
  const startValue = typeof state.focus === "number" ? state.focus : 0;
  const startTime = performance.now();
  const animationId = Symbol();

  markerFocusAnimations.set(featureId, animationId);

  const tick = (now) => {
    if (markerFocusAnimations.get(featureId) !== animationId) {
      return;
    }

    const progress = clamp01((now - startTime) / markerFocusDuration);
    const easedProgress = easeInOutCubic(progress);
    const focus = startValue + (target - startValue) * easedProgress;

    map.setFeatureState(
      {
        source: "staff",
        id: featureId,
      },
      {
        focus,
      }
    );

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    map.setFeatureState(
      {
        source: "staff",
        id: featureId,
      },
      {
        focus: target,
      }
    );
    markerFocusAnimations.delete(featureId);
  };

  requestAnimationFrame(tick);
}

function resolveStaffPhotoUrl(photo) {
  if (!photo) {
    return defaultStaffPhoto;
  }

  if (/^(https?:|data:|\/)/.test(photo) || photo.includes("/")) {
    return photo;
  }

  return `${staffPhotoBaseUrl}${photo}`;
}

function animateMarkersIn() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setFinalMarkerPaint();
    return;
  }

  const duration = 720;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = Math.max(0, easeOutBack(progress));
    const opacity = clamp01(easeOutCubic(progress));
    const translateY = -24 * (1 - clamp01(easeOutBounce(progress)));

    map.setPaintProperty("clusters", "circle-radius", [
      "*",
      Math.max(0.2, eased),
      clusterRadiusExpression,
    ]);
    map.setPaintProperty("clusters", "circle-opacity", opacity);
    map.setPaintProperty("clusters", "circle-stroke-opacity", opacity);
    map.setPaintProperty("clusters", "circle-translate", [0, translateY]);

    map.setPaintProperty("cluster-count", "text-opacity", opacity);
    map.setPaintProperty("cluster-count", "text-translate", [0, translateY]);

    map.setPaintProperty("unclustered-person", "circle-radius", 6 * Math.max(0.2, eased));
    map.setPaintProperty("unclustered-person", "circle-opacity", opacity);
    map.setPaintProperty("unclustered-person", "circle-stroke-opacity", opacity);
    map.setPaintProperty("unclustered-person", "circle-translate", [0, translateY]);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    setFinalMarkerPaint();
  };

  requestAnimationFrame(tick);
}

function setFinalMarkerPaint() {
  map.setPaintProperty("clusters", "circle-radius", interactiveClusterRadiusExpression);
  map.setPaintProperty("clusters", "circle-opacity", 1);
  map.setPaintProperty("clusters", "circle-stroke-opacity", 1);
  map.setPaintProperty("clusters", "circle-translate", [0, 0]);
  map.setPaintProperty("cluster-count", "text-opacity", 1);
  map.setPaintProperty("cluster-count", "text-translate", [0, 0]);
  map.setPaintProperty("unclustered-person", "circle-radius", interactivePersonRadiusExpression);
  map.setPaintProperty("unclustered-person", "circle-opacity", 1);
  map.setPaintProperty("unclustered-person", "circle-stroke-opacity", 1);
  map.setPaintProperty("unclustered-person", "circle-translate", [0, 0]);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function easeOutBack(value) {
  const overshoot = 1.45;
  return 1 + (overshoot + 1) * Math.pow(value - 1, 3) + overshoot * Math.pow(value - 1, 2);
}

function easeOutBounce(value) {
  const bounce = 7.5625;
  const divisor = 2.75;

  if (value < 1 / divisor) {
    return bounce * value * value;
  }

  if (value < 2 / divisor) {
    return bounce * (value -= 1.5 / divisor) * value + 0.75;
  }

  if (value < 2.5 / divisor) {
    return bounce * (value -= 2.25 / divisor) * value + 0.9375;
  }

  return bounce * (value -= 2.625 / divisor) * value + 0.984375;
}

function localizeMapAccessibility() {
  const applyMapLabel = () => {
    map
      .getContainer()
      .querySelectorAll('[aria-label="Map"]')
      .forEach((element) => element.setAttribute("aria-label", "Mapa"));
  };
  const mapLabelObserver = new MutationObserver(() => {
    applyMapLabel();
  });

  applyMapLabel();
  mapLabelObserver.observe(map.getContainer(), {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

function initTargetCrosshair() {
  const root = document.documentElement;

  const hideCrosshair = () => {
    document.body.classList.remove("is-targeting");
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") {
        hideCrosshair();
        return;
      }

      root.style.setProperty("--target-crosshair-x", `${event.clientX}px`);
      root.style.setProperty("--target-crosshair-y", `${event.clientY}px`);
      document.body.classList.add("is-targeting");
    },
    {
      capture: true,
      passive: true,
    }
  );

  window.addEventListener("pointerleave", hideCrosshair);
  window.addEventListener("blur", hideCrosshair);
}

function initPopupConnector() {
  map.on("render", updatePopupConnector);
  map.on("resize", updatePopupConnector);
}

function showPopupConnector(popup, coordinates) {
  activePopupConnector = {
    popup,
    coordinates: coordinates.slice(),
  };

  requestAnimationFrame(updatePopupConnector);
}

function hidePopupConnector() {
  activePopupConnector = null;
  document.querySelector(".popup-connector")?.classList.remove("is-visible");
}

function updatePopupConnector() {
  if (!activePopupConnector) {
    return;
  }

  const connector = document.querySelector(".popup-connector");
  const line = connector?.querySelector(".popup-connector-line");
  const markerPoint = connector?.querySelector(".popup-connector-point-marker");
  const cardCircle = connector?.querySelector(".popup-connector-point-card");
  const popupContent = activePopupConnector.popup
    .getElement()
    ?.querySelector(".maplibregl-popup-content");

  if (!connector || !line || !markerPoint || !cardCircle || !popupContent) {
    return;
  }

  const mapRect = map.getContainer().getBoundingClientRect();
  const popupRect = popupContent.getBoundingClientRect();
  const projectedMarker = map.project(activePopupConnector.coordinates);
  const markerX = mapRect.left + projectedMarker.x;
  const markerY = mapRect.top + projectedMarker.y;
  const cardPoint = getPopupConnectorCardPoint(
    popupRect,
    activePopupConnector.popup.getElement(),
    markerX,
    markerY
  );

  if (!Number.isFinite(markerX) || !Number.isFinite(markerY)) {
    connector.classList.remove("is-visible");
    return;
  }

  line.setAttribute("x1", markerX);
  line.setAttribute("y1", markerY);
  line.setAttribute("x2", cardPoint.lineX);
  line.setAttribute("y2", cardPoint.lineY);
  markerPoint.setAttribute("cx", markerX);
  markerPoint.setAttribute("cy", markerY);
  cardCircle.setAttribute("cx", cardPoint.pointX);
  cardCircle.setAttribute("cy", cardPoint.pointY);
  connector.classList.add("is-visible");
}

function getPopupConnectorCardPoint(popupRect, popupElement, markerX, markerY) {
  const anchor = getPopupAnchorName(popupElement);
  const useRightCorner = anchor.includes("right");
  const pointInset = useRightCorner
    ? -popupConnectorCardCircleInset
    : popupConnectorCardCircleInset;
  const pointX = (useRightCorner ? popupRect.right : popupRect.left) + pointInset;
  const pointY = popupRect.top + popupConnectorCardCircleInset;
  const markerDeltaX = markerX - pointX;
  const markerDeltaY = markerY - pointY;
  const markerDistance = Math.hypot(markerDeltaX, markerDeltaY) || 1;

  return {
    lineX: pointX + (markerDeltaX / markerDistance) * popupConnectorCircleRadius,
    lineY: pointY + (markerDeltaY / markerDistance) * popupConnectorCircleRadius,
    pointX,
    pointY,
  };
}

function getPopupAnchorName(popupElement) {
  return Array.from(popupElement.classList)
    .find((className) => className.startsWith("maplibregl-popup-anchor-"))
    ?.replace("maplibregl-popup-anchor-", "") || "";
}

function closeActivePopup() {
  if (!activePopup) {
    return;
  }

  closePopupWithAnimation(activePopup);
}

function closePopupWithAnimation(popup) {
  const popupElement = popup.getElement();

  if (!popupElement || popupElement.classList.contains("is-closing")) {
    return;
  }

  if (activePopup === popup) {
    hidePopupConnector();
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    popup.remove();
    if (activePopup === popup) {
      activePopup = null;
      clearActiveFeature();
    }
    return;
  }

  popupElement.classList.add("is-closing");
  window.setTimeout(() => {
    popup.remove();
    if (activePopup === popup) {
      activePopup = null;
      clearActiveFeature();
    }
  }, popupCloseDuration);
}

function bindPopupCloseAnimation(popup) {
  const popupElement = popup.getElement();
  const closeButton = popupElement.querySelector(".maplibregl-popup-close-button");

  if (!closeButton) {
    return;
  }

  closeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    closePopupWithAnimation(popup);
  }, true);
}

function renderPersonCard(person) {
  const photo = `<img src="${escapeHtml(person.photo || defaultStaffPhoto)}" alt="" onerror="this.onerror=null;this.src='${escapeHtml(defaultStaffPhoto)}';">`;
  const hasLinkedin = /^https?:\/\//.test(person.linkedin || "");
  const linkedin = hasLinkedin
    ? `<a class="linkedin" href="${escapeHtml(person.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de ${escapeHtml(person.name)}"><img src="assets/linkedin.png" alt=""></a>`
    : "";
  const agency = person.agency || person.location;

  return `
    <article class="person-card">
      <div class="photo">${photo}</div>
      <div class="content">
        <h2>${escapeHtml(person.name)}</h2>
        <p class="role">${escapeHtml(person.job)}</p>
        <div class="footer">
          <div class="agency">
            <span class="label">Agência</span>
            <p>${escapeHtml(agency)}</p>
          </div>
          ${linkedin}
        </div>
      </div>
    </article>
  `;
}

function getPopupAnchor(point) {
  const canvas = map.getCanvas();
  const hasRoomRight =
    point.x + popupConnectorGap + popupCardWidth <= canvas.clientWidth - popupViewportPadding;
  const hasRoomLeft =
    point.x - popupConnectorGap - popupCardWidth >= popupViewportPadding;
  const hasRoomBelow =
    point.y + popupConnectorGap + popupCardEstimatedHeight <=
    canvas.clientHeight - popupViewportPadding;
  const hasRoomAbove =
    point.y - popupConnectorGap - popupCardEstimatedHeight >= popupViewportPadding;
  const horizontalAnchor = hasRoomRight || !hasRoomLeft ? "left" : "right";

  if (!hasRoomBelow && !hasRoomAbove) {
    return horizontalAnchor;
  }

  const verticalAnchor = hasRoomBelow ? "top" : "bottom";

  return `${verticalAnchor}-${horizontalAnchor}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}
