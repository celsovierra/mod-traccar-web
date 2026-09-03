import React, { useEffect, useState } from 'react';
import { getAllAnchors } from '../common/util/anchorStore';

const MapAnchorOverlay = () => {
  const [anchors, setAnchors] = useState({});

  useEffect(() => {
    const checkAnchors = () => {
      setAnchors(getAllAnchors());
    };
    checkAnchors();
    const interval = setInterval(checkAnchors, 1500);
    return () => clearInterval(interval);
  }, []);

  return null;
};

export default MapAnchorOverlay;
