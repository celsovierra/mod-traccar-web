python3 -c '
path = "src/map/MapGeofence.js"
clean_content = """import { useEffect } from \"react\";
import { useSelector } from \"react-redux\";
import { useTheme } from \"@mui/material/styles\";
import { map } from \"./core/MapView\";

const MapGeofence = () => {
  const theme = useTheme();
  const geofences = useSelector((state) => state.geofences.items);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = \"geofences-source\";
    const fillLayerId = \"geofences-fill\";
    const lineLayerId = \"geofences-line\";

    const serverFeatures = Object.values(geofences).map((g) => ({
      type: \"Feature\",
      properties: {
        id: g.id,
        name: g.name,
        color: g.attributes?.color || theme.palette.geometry?.main || \"#3b82f6\",
      },
      geometry: {
        type: \"Polygon\",
        coordinates: [],
      },
    }));

    const data = {
      type: \"FeatureCollection\",
      features: serverFeatures,
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: \"geojson\",
        data,
      });
    } else {
      map.getSource(sourceId).setData(data);
    }

    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: \"fill\",
        source: sourceId,
        paint: {
          \"fill-color\": [\"get\", \"color\"],
          \"fill-opacity\": 0.25,
        },
      });
    }

    if (!map.getLayer(lineLayerId)) {
      map.addLayer({
        id: lineLayerId,
        type: \"line\",
        source: sourceId,
        paint: {
          \"line-color\": [\"get\", \"color\"],
          \"line-width\": 2,
          \"line-opacity\": 0.9,
        },
      });
    }
  }, [geofences, theme]);

  return null;
};

export default MapGeofence;
"""

with open(path, "w") as f:
    f.write(clean_content)
print("MapGeofence.js totalmente limpo e restaurado.")
'

git add .
git commit -m "Limpeza total do MapGeofence removendo restos da ancora"
git push origin main
npm run build && rm -rf /opt/traccar/web && cp -r build /opt/traccar/web && systemctl restart traccar