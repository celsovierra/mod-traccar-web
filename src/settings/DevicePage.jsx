import { useDeviceEdit } from "../features/deviceEdit/useDeviceEdit";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Box,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TuneIcon from "@mui/icons-material/Tune";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import EditItemView from "./components/EditItemView";
import SelectField from "../common/components/SelectField";
import deviceCategories from "../common/util/deviceCategories";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useManager } from "../common/util/permissions";
import { useCatch } from "../reactHelper";
import useSettingsStyles from "./common/useSettingsStyles";
import QrCodeDialog from "../common/components/QrCodeDialog";
import fetchOrThrow from "../common/util/fetchOrThrow";
import { devicesActions } from "../store";

const DevicePage = () => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const manager = useManager();

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get("uniqueId");

  const [item, setItem] = useState(uniqueId ? { uniqueId } : null);
  const [showQr, setShowQr] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [localPlate, setLocalPlate] = useState("");
  const [localModel, setLocalModel] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (item && !initialized) {
      setLocalPlate(item.attributes?.plate || "");
      setLocalModel(item.model || "");
      setInitialized(true);
    }
  }, [item, initialized]);

  const [expandedPanel, setExpandedPanel] = useState("required");

  const handleChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`/api/devices/${item.id}/image`, {
        method: "POST",
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      const { deviceImage, ...remainingAttributes } = item.attributes || {};
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const handlePlateChange = (event) => {
    const rawValue = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setLocalPlate(rawValue);
  };

  const handleModelChange = (event) => {
    setLocalModel(event.target.value);
  };

  const validate = () => item && item.name && item.uniqueId;

  const { saveDeviceEdits } = useDeviceEdit(item, setItem);
  const handleCustomSave = useCatch(async () => {
    const success = await saveDeviceEdits();
    if (!success) {
      throw new Error("Falha ao salvar dispositivo.");
    }
    navigate(-1);
    // Usa o módulo isolado de edição para garantir salvamento seguro para admin e usuário comum
    const success = await saveDeviceEdits({ name: item.name, uniqueId: item.uniqueId });
    if (!success) {
      throw new Error("Erro ao salvar alterações do veículo.");
    }
    navigate(-1);
    const payload = {
      ...item,
      model: localModel,
      attributes: {
        ...(item?.attributes || {}),
        plate: localPlate,
      },
    };

    const response = await fetch(`/api/devices/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    const updated = await response.json();
    // Força nova referência no objeto para o Redux disparar o re-render imediato
    const forcedUpdated = { ...updated, attributes: { ...updated.attributes }, _t: Date.now() };
    dispatch(devicesActions.update([forcedUpdated]));
    dispatch(devicesActions.refresh({ [updated.id]: updated }));
    const listRes = await fetch("/api/devices");
    if (listRes.ok) {
      const allDevices = await listRes.json();
      const refreshedMap = {};
      allDevices.forEach((d) => { refreshedMap[d.id] = d; });
      dispatch(devicesActions.refresh(refreshedMap));
    }
    navigate(-1);
  });

  return (
    <EditItemView
      endpoint="devices"
      item={item}
      setItem={setItem}
      validate={validate}
      onSave={item?.id ? handleCustomSave : undefined}
      breadcrumbs={["sharedDevice"]}
    >
      {item && (
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            mx: "auto",
            p: { xs: 1, sm: 2 },
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
              backgroundColor: "#f9fafb",
              transition: "all 0.2s",
              "&:hover": {
                backgroundColor: "#ffffff",
              },
              "&.Mui-focused": {
                backgroundColor: "#ffffff",
                boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.15)",
              },
            },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: "20px",
              mb: 2,
              border: "1px solid #edf2f7",
              boxShadow: "0 8px 24px rgba(149, 157, 165, 0.08)",
              overflow: "hidden",
            }}
          >
            <Accordion
              expanded={expandedPanel === "required"}
              onChange={handleChange("required")}
              sx={{
                boxShadow: "none",
                backgroundColor: "transparent",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#7c3aed" }} />}
                sx={{
                  px: 2.5,
                  py: 1,
                  backgroundColor: expandedPanel === "required" ? "#f5f3ff" : "#ffffff",
                  transition: "background-color 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      backgroundColor: expandedPanel === "required" ? "#ede9fe" : "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 20, color: "#7c3aed" }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", fontSize: "0.98rem" }}>
                    {t("sharedRequired")}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  value={item.name || ""}
                  onChange={(event) => setItem({ ...item, name: event.target.value })}
                  label={t("sharedName")}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={item.uniqueId || ""}
                  onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                  label={t("deviceIdentifier")}
                  disabled={Boolean(uniqueId)}
                  fullWidth
                  variant="outlined"
                />
              </AccordionDetails>
            </Accordion>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: "20px",
              mb: 2,
              border: "1px solid #edf2f7",
              boxShadow: "0 8px 24px rgba(149, 157, 165, 0.08)",
              overflow: "hidden",
            }}
          >
            <Accordion
              expanded={expandedPanel === "extra"}
              onChange={handleChange("extra")}
              sx={{
                boxShadow: "none",
                backgroundColor: "transparent",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#7c3aed" }} />}
                sx={{
                  px: 2.5,
                  py: 1,
                  backgroundColor: expandedPanel === "extra" ? "#f5f3ff" : "#ffffff",
                  transition: "background-color 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      backgroundColor: expandedPanel === "extra" ? "#ede9fe" : "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TuneIcon sx={{ fontSize: 20, color: "#7c3aed" }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", fontSize: "0.98rem" }}>
                    {t("sharedExtra")}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                <SelectField
                  value={item.groupId}
                  onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                  endpoint="/api/groups"
                  label={t("groupParent")}
                  fullWidth
                />
                <TextField
                  value={item.phone || ""}
                  onChange={(event) => setItem({ ...item, phone: event.target.value })}
                  label={t("sharedPhone")}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={localModel}
                  onChange={handleModelChange}
                  label={t("deviceModel")}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  value={localPlate}
                  onChange={handlePlateChange}
                  label="Placa do Veículo"
                  placeholder="Ex: ABC1D23"
                  inputProps={{ maxLength: 8, style: { textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 } }}
                  helperText="Exibida na placa Mercosul"
                  fullWidth
                  variant="outlined"
                />
                <SelectField
                  value={item.category || "default"}
                  onChange={(event) => setItem({ ...item, category: event.target.value })}
                  data={deviceCategories
                    .map((category) => ({
                      id: category,
                      name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))}
                  label={t("deviceCategory")}
                  fullWidth
                />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={item.disabled}
                        onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                        sx={{ color: "#7c3aed", "&.Mui-checked": { color: "#6d28d9" } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#475569" }}>{t("sharedDisabled")}</Typography>}
                    disabled={!manager}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => setShowQr(true)}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 700,
                      borderColor: "#ddd6fe",
                      color: "#7c3aed",
                      backgroundColor: "#f5f3ff",
                      "&:hover": {
                        borderColor: "#7c3aed",
                        backgroundColor: "#ede9fe",
                      },
                    }}
                  >
                    {t("sharedQrCode")}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Paper>

          {item.id && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "20px",
                mb: 2,
                border: "1px solid #edf2f7",
                boxShadow: "0 8px 24px rgba(149, 157, 165, 0.08)",
                overflow: "hidden",
              }}
            >
              <Accordion
                expanded={expandedPanel === "image"}
                onChange={handleChange("image")}
                sx={{
                  boxShadow: "none",
                  backgroundColor: "transparent",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "#7c3aed" }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    backgroundColor: expandedPanel === "image" ? "#f5f3ff" : "#ffffff",
                    transition: "background-color 0.2s",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        backgroundColor: expandedPanel === "image" ? "#ede9fe" : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AddPhotoAlternateIcon sx={{ fontSize: 20, color: "#7c3aed" }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", fontSize: "0.98rem" }}>
                      {t("attributeDeviceImage")}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2.5 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AddPhotoAlternateIcon />}
                    fullWidth
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 700,
                      borderColor: "#ddd6fe",
                      color: "#7c3aed",
                      backgroundColor: "#f5f3ff",
                      py: 1.5,
                      "&:hover": {
                        borderColor: "#7c3aed",
                        backgroundColor: "#ede9fe",
                      },
                    }}
                  >
                    {imageFile ? imageFile.name : t("attributeDeviceImage")}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileInput(e.target.files[0]);
                        }
                      }}
                    />
                  </Button>
                </AccordionDetails>
              </Accordion>
            </Paper>
          )}
        </Box>
      )}
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
    </EditItemView>
  );
};

export default DevicePage;
