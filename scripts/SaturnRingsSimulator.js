const { useState, useEffect, useRef } = React;

const SaturnRingsSimulator = () => {
  const canvasRef = useRef(null);
  const [dataSets, setDataSets] = useState({
    backscattered: null,
    forwardscattered: null,
    unlitside: null,
    transparency: null,
    color: null,
  });

  const [loadingStatus, setLoadingStatus] = useState("Waiting for files...");
  const [phaseAngle, setPhaseAngle] = useState(0);

  const DATA_LENGTH = 13177;
  const INNER_RADIUS_KM = 74510;
  const OUTER_RADIUS_KM = 140390;

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    setLoadingStatus("Parsing files...");

    const parsedData = { ...dataSets };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const values = lines.map((line) => {
        const parts = line.split(/\s+|,/);
        if (parts.length >= 3) {
          return [
            parseFloat(parts[0]),
            parseFloat(parts[1]),
            parseFloat(parts[2]),
          ];
        }
        return parseFloat(parts[0]);
      });

      const name = file.name.toLowerCase();
      if (name.includes("backscattered")) parsedData.backscattered = values;
      else if (name.includes("forwardscattered"))
        parsedData.forwardscattered = values;
      else if (name.includes("unlitside")) parsedData.unlitside = values;
      else if (name.includes("transparency")) parsedData.transparency = values;
      else if (name.includes("color")) parsedData.color = values;
    }

    setDataSets(parsedData);

    const missing = Object.keys(parsedData).filter((key) => !parsedData[key]);
    if (missing.length === 0) {
      setLoadingStatus("All data loaded. Ready to render.");
    } else {
      setLoadingStatus(`Missing files: ${missing.join(", ")}`);
    }
  };

  const getInterpolatedBrightness = (index, angle) => {
    const { backscattered, forwardscattered, unlitside } = dataSets;
    const bVal = backscattered[index] || 0;
    const fVal = forwardscattered[index] || 0;
    const uVal = unlitside[index] || 0;

    if (angle <= 139) {
      const ratio = angle / 139;
      return bVal * (1 - ratio) + fVal * ratio;
    } else {
      const ratio = (angle - 139) / (180 - 139);
      return fVal * (1 - ratio) + uVal * ratio;
    }
  };

  const renderRings = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const isReady = Object.values(dataSets).every((val) => val !== null);
    if (!isReady) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const centerX = width / 2;
    const centerY = height / 2;

    const maxPixelRadius = Math.min(width, height) / 2;
    const minPixelRadius = maxPixelRadius * (INNER_RADIUS_KM / OUTER_RADIUS_KM);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= minPixelRadius && distance <= maxPixelRadius) {
          const ratio =
            (distance - minPixelRadius) / (maxPixelRadius - minPixelRadius);
          const dataIndex = Math.floor(ratio * (DATA_LENGTH - 1));

          const pixelIndex = (y * width + x) * 4;
          const brightness = getInterpolatedBrightness(dataIndex, phaseAngle);
          const alpha = dataSets.transparency[dataIndex] || 0;

          let r = 255,
            g = 255,
            b = 255;

          if (phaseAngle < 180) {
            const rawColor = dataSets.color[dataIndex];
            if (Array.isArray(rawColor)) {
              r = rawColor[0] * 255;
              g = rawColor[1] * 255;
              b = rawColor[2] * 255;
            } else {
              r = 255 * (rawColor || 1);
              g = 247 * (rawColor || 1);
              b = 242 * (rawColor || 1);
            }
          } else {
            r = 255 * 1.0;
            g = 255 * 0.97075;
            b = 255 * 0.952;
          }

          data[pixelIndex] = r * brightness;
          data[pixelIndex + 1] = g * brightness;
          data[pixelIndex + 2] = b * brightness;
          data[pixelIndex + 3] = alpha * 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  useEffect(() => {
    renderRings();
  }, [dataSets, phaseAngle]);

  return (
    <div className="container">
      <h2>Saturn Rings Simulation</h2>

      <div className="panel">
        <h3>1. Load Data Files</h3>
        <p>Upload the 5 text files here.</p>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          style={{ color: "#fff", marginBottom: "10px" }}
        />

        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Status</th>
              <th>Lines Parsed</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(dataSets).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td style={{ color: dataSets[key] ? "#4caf50" : "#f44336" }}>
                  {dataSets[key] ? "Loaded" : "Missing"}
                </td>
                <td>
                  {dataSets[key] ? dataSets[key].length : 0} / {DATA_LENGTH}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          style={{
            marginTop: "15px",
            color: loadingStatus.includes("Ready") ? "#4caf50" : "#ff9800",
          }}
        >
          {loadingStatus}
        </p>
      </div>

      <div className="panel">
        <h3>2. Observation Parameters</h3>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <span>Phase Angle: {phaseAngle} degrees</span>
          <input
            type="range"
            min="0"
            max="180"
            value={phaseAngle}
            onChange={(e) => setPhaseAngle(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <small style={{ color: "#aaa" }}>
            0 = Backscattered | 139 = Forward Scattered | 180 = Unlit Side
          </small>
        </label>
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={800} height={800} />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SaturnRingsSimulator />);
