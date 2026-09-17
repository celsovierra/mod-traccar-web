import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon } from './mapUtil';

import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import defaultSvg from '../../resources/images/icon/default.svg';
import iconSizes from '../../resources/images/icon/iconSizes.json';

const staticIconFiles = import.meta.glob('../../resources/images/icon/estaticos/*.{svg,png,jpg,jpeg,webp,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const rotativeIconFiles = import.meta.glob(
  '../../resources/images/icon/rotativos/*.{png,jpg,jpeg,webp,svg,gif}',
  { eager: true, query: '?url', import: 'default' },
);

const keyFromPath = (path) => path.split('/').pop().replace(/\.[^/.]+$/, '');

export const mapIcons = { default: defaultSvg };

// Guarda quais categorias vieram da pasta "rotativos" - so essas devem girar conforme a direcao.
export const rotativeIconKeys = new Set();

Object.entries(staticIconFiles).forEach(([path, url]) => {
  mapIcons[keyFromPath(path)] = url;
});
Object.entries(rotativeIconFiles).forEach(([path, url]) => {
  const key = keyFromPath(path);
  mapIcons[key] = url;
  rotativeIconKeys.add(key);
});

export const mapIconKey = (category) => {
  switch (category) {
    case 'offroad':
    case 'pickup':
      return mapIcons.hasOwnProperty('car') ? 'car' : 'default';
    case 'trolleybus':
      return mapIcons.hasOwnProperty('bus') ? 'bus' : 'default';
    case 'moto':
    case 'motorcycle2':
      return mapIcons.hasOwnProperty('motorcycle') ? 'motorcycle' : 'default';
    default:
      return mapIcons.hasOwnProperty(category) ? category : 'default';
  }
};

export const mapImages = {};

const theme = createTheme({
  palette: {
    neutral: { main: grey[500] },
  },
});

export default async () => {
  const background = await loadImage(backgroundSvg);
  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIcon(await loadImage(directionSvg));
  await Promise.all(
    Object.keys(mapIcons).map(async (category) => {
      const shape = iconSizes[category] || iconSizes.default;
      const results = [];
      ['info', 'success', 'error', 'neutral'].forEach((color) => {
        results.push(
          loadImage(mapIcons[category]).then((icon) => {
            mapImages[`${category}-${color}`] = prepareIcon(
              background,
              icon,
              theme.palette[color].main,
              shape,
            );
          }).catch((e) => console.error('Erro ao carregar icone:', category, e)),
        );
      });
      await Promise.all(results);
    }),
  );
};
