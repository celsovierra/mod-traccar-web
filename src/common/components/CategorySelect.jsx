import { useState, useRef } from "react";
import { Box, Menu, MenuItem, Typography, Grid, IconButton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import deviceCategories from "../util/deviceCategories";
import { useTranslation } from "./LocalizationProvider";
import motorcyclePng from "../../resources/images/motorcycle.png";
import carAzul from "../../resources/images/car-azul.webp";

const icons = import.meta.glob("../../resources/images/icon/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const customIconFiles = import.meta.glob(
  "../../resources/images/custom/*.{png,jpg,jpeg,webp,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

const overrides = {
  car: carAzul,
  motorcycle: motorcyclePng,
};

const getStandardIcon = (category) => {
  if (overrides[category]) {
    return overrides[category];
  }
  const match = Object.entries(icons).find(([path]) => path.endsWith(`/${category}.svg`));
  return match ? match[1] : icons["../../resources/images/icon/default.svg"];
};

const prettifyFileName = (path) => {
  const fileName = path.split("/").pop().replace(/\.[^/.]+$/, "");
  return fileName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const customOptions = Object.entries(customIconFiles).map(([path, url]) => ({
  id: `custom:${path.split("/").pop()}`,
  name: prettifyFileName(path),
  icon: url,
}));

const CategorySelect = ({ value, onChange, label, fullWidth }) => {
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const selected = value || "default";

  const categoryLabel = (category) =>
    t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`);

  const allOptions = [
    ...deviceCategories.map((category) => ({
      id: category,
      name: categoryLabel(category),
      icon: getStandardIcon(category),
    })),
    ...customOptions,
  ];

  const selectedOption = allOptions.find((o) => o.id === selected) || allOptions[0];

  const handleSelect = (id) => {
    onChange({ target: { value: id } });
    setAnchorEl(null);
  };

  const handleUploadClick = (event) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const name = window.prompt("Nome do ícone:", file.name.replace(/\.[^/.]+$/, ""));
    if (!name) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const response = await fetch("/api/dev-save-icon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dataUrl: reader.result }),
        });
        if (!response.ok) throw new Error(await response.text());
        window.alert("Ícone salvo em src/resources/images/custom/. Recarregando a página...");
        window.location.reload();
      } catch (err) {
        window.alert("Erro ao salvar ícone: " + err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, ml: 0.5 }}>
        {label}
      </Typography>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          backgroundColor: "#f9fafb",
          p: 1.2,
          cursor: "pointer",
          "&:hover": { backgroundColor: "#fff" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <img src={selectedOption.icon} alt={selectedOption.name} style={{ width: 32, height: 32, objectFit: "contain" }} />
          <Typography sx={{ fontWeight: 700 }}>{selectedOption.name}</Typography>
        </Box>
        <ExpandMoreIcon sx={{ color: "#7c3aed" }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { p: 1, maxHeight: 460 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, pb: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleUploadClick}
            disabled={uploading}
            title="Enviar novo ícone (salva no projeto)"
            sx={{ color: "#7c3aed", backgroundColor: "#f5f3ff", "&:hover": { backgroundColor: "#ede9fe" } }}
          >
            <AddPhotoAlternateIcon fontSize="small" />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </Box>
        <Grid container spacing={1} sx={{ width: 340 }}>
          {allOptions.map((option) => (
            <Grid item xs={4} key={option.id}>
              <MenuItem
                selected={option.id === selected}
                onClick={() => handleSelect(option.id)}
                sx={{ flexDirection: "column", borderRadius: "12px", gap: 0.5, py: 1 }}
              >
                <img src={option.icon} alt={option.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, textAlign: "center" }}>
                  {option.name}
                </Typography>
              </MenuItem>
            </Grid>
          ))}
        </Grid>
      </Menu>
    </Box>
  );
};

export default CategorySelect;
