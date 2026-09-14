import { useState } from "react";
import { Box, Menu, MenuItem, Typography, Grid } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import deviceCategories from "../util/deviceCategories";
import { useTranslation } from "./LocalizationProvider";

const icons = import.meta.glob("../../resources/images/icon/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const getIcon = (category) => {
  const match = Object.entries(icons).find(([path]) => path.endsWith(`/${category}.svg`));
  return match ? match[1] : icons["../../resources/images/icon/default.svg"];
};

const CategorySelect = ({ value, onChange, label, fullWidth }) => {
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const selected = value || "default";

  const handleSelect = (category) => {
    onChange({ target: { value: category } });
    setAnchorEl(null);
  };

  const categoryLabel = (category) =>
    t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`);

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
          <img src={getIcon(selected)} alt={selected} style={{ width: 32, height: 32 }} />
          <Typography sx={{ fontWeight: 700 }}>{categoryLabel(selected)}</Typography>
        </Box>
        <ExpandMoreIcon sx={{ color: "#7c3aed" }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { p: 1, maxHeight: 420 } }}
      >
        <Grid container spacing={1} sx={{ width: 340 }}>
          {deviceCategories.map((category) => (
            <Grid item xs={4} key={category}>
              <MenuItem
                selected={category === selected}
                onClick={() => handleSelect(category)}
                sx={{ flexDirection: "column", borderRadius: "12px", gap: 0.5, py: 1 }}
              >
                <img src={getIcon(category)} alt={category} style={{ width: 36, height: 36 }} />
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, textAlign: "center" }}>
                  {categoryLabel(category)}
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
