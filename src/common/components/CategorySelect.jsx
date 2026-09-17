import { useState, useRef } from "react";
import { Box, Menu, MenuItem, Typography, Grid, IconButton, Divider, Dialog, DialogContent, DialogTitle, TextField, Button } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import defaultSvg from "../../resources/images/icon/default.svg";
import iconSizesData from "../../resources/images/icon/iconSizes.json";

const staticIcons = import.meta.glob("../../resources/images/icon/estaticos/*.{svg,png,jpg,jpeg,webp,gif}", {
  eager: true,
  query: "?url",
  import: "default",
});

const rotativeIcons = import.meta.glob(
  "../../resources/images/icon/rotativos/*.{png,jpg,jpeg,webp,svg,gif}",
  { eager: true, query: "?url", import: "default" }
);

const keyFromPath = (path) => path.split("/").pop().replace(/\.[^/.]+$/, "");
const prettify = (key) => key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const buildOptions = (glob) =>
  Object.entries(glob).map(([path, url]) => ({
    id: keyFromPath(path),
    name: prettify(keyFromPath(path)),
    icon: url,
  }));

const staticOptions = buildOptions(staticIcons);
const rotativeOptionsBase = buildOptions(rotativeIcons);

const CategorySelect = ({ value, onChange, label, fullWidth }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rotativeOptions, setRotativeOptions] = useState(rotativeOptionsBase);
  const [sizeEditorKey, setSizeEditorKey] = useState(null);
  const [sizeForm, setSizeForm] = useState({ tamanho: 1, largura: 1, altura: 1 });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);
  const selected = value || "default";

  const defaultOption = { id: "default", name: "Padrão", icon: defaultSvg };
  const allOptions = [defaultOption, ...staticOptions, ...rotativeOptions];

  const selectedOption = allOptions.find((o) => o.id === selected) || defaultOption;
  const previewOption = allOptions.find((o) => o.id === sizeEditorKey) || defaultOption;

  const handleSelect = (id) => {
    onChange({ target: { value: id } });
    setAnchorEl(null);
  };

  const handleIconClick = (option) => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current >= 3) {
        openSizeEditor(option);
      } else {
        handleSelect(option.id);
      }
      clickCountRef.current = 0;
    }, 350);
  };

  const openSizeEditor = (option) => {
    const current = iconSizesData[option.id] || iconSizesData.default || { tamanho: 1, largura: 1, altura: 1 };
    setSizeForm({
      tamanho: current.tamanho ?? 1,
      largura: current.largura ?? 1,
      altura: current.altura ?? 1,
    });
    setSizeEditorKey(option.id);
  };

  const handleSaveSize = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/save-icon-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sizeEditorKey, ...sizeForm }),
      });
      if (!response.ok) throw new Error(await response.text());
      window.alert("Tamanho salvo! Recarregando a página para aplicar...");
      window.location.reload();
    } catch (err) {
      window.alert("Erro ao salvar tamanho: " + err.message);
    } finally {
      setSaving(false);
    }
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
        window.alert("Ícone salvo em src/resources/images/icon/rotativos/. Recarregando a página...");
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

  const renderGroup = (title, options) => (
    <>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", px: 1, pt: 1 }}>
        {title}
      </Typography>
      <Grid container spacing={1} sx={{ width: 340, px: 0.5, pb: 1 }}>
        {options.map((option) => (
          <Grid item xs={4} key={option.id}>
            <MenuItem
              selected={option.id === selected}
              onClick={() => handleIconClick(option)}
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
    </>
  );

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const previewScaleX = num(sizeForm.tamanho) * num(sizeForm.largura);
  const previewScaleY = num(sizeForm.tamanho) * num(sizeForm.altura);

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

      <Typography sx={{ fontSize: "0.65rem", color: "#94a3b8", mt: 0.5, ml: 0.5 }}>
        Dica: clique 3x seguidas num ícone da lista pra ajustar o tamanho dele
      </Typography>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { p: 1, maxHeight: 480 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1 }}>
          <IconButton
            size="small"
            onClick={handleUploadClick}
            disabled={uploading}
            title="Enviar novo ícone (rotativo)"
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
        <Grid container spacing={1} sx={{ width: 340, px: 0.5, pb: 0.5 }}>
          <Grid item xs={4}>
            <MenuItem
              selected={defaultOption.id === selected}
              onClick={() => handleIconClick(defaultOption)}
              sx={{ flexDirection: "column", borderRadius: "12px", gap: 0.5, py: 1 }}
            >
              <img src={defaultOption.icon} alt="Padrão" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, textAlign: "center" }}>Padrão</Typography>
            </MenuItem>
          </Grid>
        </Grid>
        <Divider sx={{ my: 0.5 }} />
        {renderGroup("Ícones que seguem a rota", rotativeOptions)}
        <Divider sx={{ my: 0.5 }} />
        {renderGroup("Ícones estáticos", staticOptions)}
      </Menu>

      <Dialog open={Boolean(sizeEditorKey)} onClose={() => setSizeEditorKey(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Ajustar tamanho: {sizeEditorKey ? prettify(sizeEditorKey) : ""}
          <IconButton size="small" onClick={() => setSizeEditorKey(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box
            sx={{
              width: 160,
              height: 160,
              mx: "auto",
              mb: 0.5,
              border: "1px dashed #cbd5e1",
              borderRadius: 3,
              backgroundColor: "#f8fafc",
              backgroundImage:
                "linear-gradient(45deg, #eef2f7 25%, transparent 25%), linear-gradient(-45deg, #eef2f7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eef2f7 75%), linear-gradient(-45deg, transparent 75%, #eef2f7 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={previewOption.icon}
              alt="prévia"
              style={{
                width: "60%",
                height: "60%",
                objectFit: "contain",
                transform: `scale(${previewScaleX}, ${previewScaleY})`,
                transition: "transform 0.12s ease",
              }}
            />
          </Box>
          <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", mt: -1.5 }}>
            Prévia (aproximada) de como o ícone vai ficar
          </Typography>
          <TextField
            label="Tamanho"
            type="number"
            inputProps={{ step: 0.05, min: 0.1, max: 5 }}
            value={sizeForm.tamanho}
            onChange={(e) => setSizeForm({ ...sizeForm, tamanho: e.target.value })}
            helperText="Tamanho geral do ícone no mapa (1 = normal)"
            fullWidth
          />
          <TextField
            label="Largura"
            type="number"
            inputProps={{ step: 0.05, min: 0.1, max: 3 }}
            value={sizeForm.largura}
            onChange={(e) => setSizeForm({ ...sizeForm, largura: e.target.value })}
            helperText="Só a largura da imagem (1 = original)"
            fullWidth
          />
          <TextField
            label="Altura"
            type="number"
            inputProps={{ step: 0.05, min: 0.1, max: 3 }}
            value={sizeForm.altura}
            onChange={(e) => setSizeForm({ ...sizeForm, altura: e.target.value })}
            helperText="Só a altura da imagem (1 = original)"
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleSaveSize}
            disabled={saving}
            sx={{ backgroundColor: "#7c3aed", "&:hover": { backgroundColor: "#6d28d9" } }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CategorySelect;
