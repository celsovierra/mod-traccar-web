import { map } from '../../map/core/MapView';

export const createVehicleIcon = (color, direction = 0, callback) => {
  const imageName = `moto-${(color || '#ef4444').replace('#', '')}-${direction}`;

  if (map && !map.hasImage(imageName)) {
    const img = new Image();
    img.src = '/moto-template.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');

      ctx.translate(24, 24);
      ctx.rotate((direction * Math.PI) / 180);
      ctx.translate(-24, -24);

      ctx.drawImage(img, 0, 0, 48, 48);

      if (!map.hasImage(imageName)) {
        map.addImage(imageName, canvas);
        if (callback) callback();
      }
    };
  }

  return imageName;
};