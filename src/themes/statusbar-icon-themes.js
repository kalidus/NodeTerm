import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  // Iconos básicos
  faMicrochip, 
  faMemory, 
  faHdd, 
  faArrowDown, 
  faArrowUp, 
  faClock, 
  faServer,
  faCircle,
  faSquare,
  faHeart,
  faStar,
  faBolt,
  faFire,
  faGem,
  faAtom,
  faCog,
  faDatabase,
  faWifi,
  faThermometerHalf,
  faThermometerFull,
  faLightbulb,
  faCube,
  faSnowflake,
  faEye,
  faBrain,
  faRobot,
  faTerminal,
  faShield,
  faLock,
  faKey,
  faFingerprint,
  faDna,
  faCompass,
  faFlag,
  faTrophy,
  faCalculator,
  faMicroscope,
  faFlask,
  faStethoscope,
  faHeartbeat,
  faDesktop,
  faLaptop,
  faTablet,
  faMobile,
  faPlug,
  faBatteryFull,
  faBatteryHalf,
  faFan,
  faSignal,
  faIndustry,
  faTachometerAlt,
  faChartLine,
  faChartBar,
  faChartArea,
  faChartPie,
  // Iconos adicionales modernos
  faLayerGroup,
  faNetworkWired,
  faEthernet,
  faSdCard,
  faHardDrive,
  faUsb,
  faMicrophone,
  faVolumeUp,
  faVolumeDown,
  faWaveSquare,
  faPowerOff,
  faPlay,
  faPause,
  faStop,
  faForward,
  faBackward,
  faStepForward,
  faStepBackward,
  faRandom,
  faRepeat,
  faExchange,
  faExchangeAlt,
  faSyncAlt,
  faSpinner,
  faCircleNotch,
  faCogs,
  faTools,
  faWrench,
  faHammer,
  faScrewdriver,
  faProjectDiagram,
  faSitemap,
  faShareAlt,
  faRss,
  faBroadcastTower,
  faRadio,
  faSatellite,
  faSatelliteDish,
  faAnchor,
  faCompass as faCompassAlt,
  faRoute,
  faMapMarkerAlt,
  faGlobe,
  faGlobeAmericas,
  faGlobeAsia,
  faGlobeEurope,
  faCloud,
  faCloudUploadAlt,
  faCloudDownloadAlt,
  faThumbsUp,
  faThumbsDown,
  faHandPaper,
  faHandRock,
  faHandPeace,
  faHandPointUp,
  faHandPointDown,
  faFingerprint as faFingerprintAlt,
  faIdCard,
  faUserShield,
  faShieldAlt,
  faLockOpen,
  faUnlock,
  faUserLock,
  faSearch,
  faSearchPlus,
  faSearchMinus,
  faZoomIn,
  faZoomOut,
  faCrosshairs,
  faTarget,
  faBullseye,
  faLocationArrow,
  faMapPin,
  faMap,
  faChevronUp,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faAngleUp,
  faAngleDown,
  faAngleLeft,
  faAngleRight,
  faCaretUp,
  faCaretDown,
  faCaretLeft,
  faCaretRight,
  faSort,
  faSortUp,
  faSortDown,
  faFilter,
  faFunnel,
  faSliders,
  faSlidersH,
  faAdjust,
  faBalance,
  faBalanceScale,
  faWeightHanging,
  faWeight
} from '@fortawesome/free-solid-svg-icons';

// Temas de iconos para la status bar
export const statusBarIconThemes = {
  classic: {
    name: 'Clásico',
    icons: {
      cpu: <FontAwesomeIcon icon={faMicrochip} />,
      memory: <FontAwesomeIcon icon={faMemory} />,
      disk: <FontAwesomeIcon icon={faHdd} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faServer} />
    },
    colors: {
      cpu: '#ff6b35',
      memory: '#4fc3f7',
      disk: '#ffa726',
      networkDown: '#66bb6a',
      networkUp: '#ef5350',
      uptime: '#ab47bc',
      server: '#78909c'
    }
  },

  minimal: {
    name: 'Minimal',
    icons: {
      cpu: <FontAwesomeIcon icon={faCircle} />,
      memory: <FontAwesomeIcon icon={faSquare} />,
      disk: <FontAwesomeIcon icon={faCircle} />,
      networkDown: <FontAwesomeIcon icon={faChevronDown} />,
      networkUp: <FontAwesomeIcon icon={faChevronUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faSquare} />
    },
    colors: {
      cpu: '#666',
      memory: '#666',
      disk: '#666',
      networkDown: '#666',
      networkUp: '#666',
      uptime: '#666',
      server: '#666'
    }
  },

  performance: {
    name: 'Rendimiento',
    icons: {
      cpu: <FontAwesomeIcon icon={faTachometerAlt} />,
      memory: <FontAwesomeIcon icon={faChartBar} />,
      disk: <FontAwesomeIcon icon={faChartPie} />,
      networkDown: <FontAwesomeIcon icon={faChevronDown} />,
      networkUp: <FontAwesomeIcon icon={faChevronUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faChartLine} />
    },
    colors: {
      cpu: '#e74c3c',
      memory: '#3498db',
      disk: '#f39c12',
      networkDown: '#27ae60',
      networkUp: '#e67e22',
      uptime: '#9b59b6',
      server: '#34495e'
    }
  },

  modern: {
    name: 'Moderno',
    icons: {
      cpu: <FontAwesomeIcon icon={faMicrochip} />,
      memory: <FontAwesomeIcon icon={faLayerGroup} />,
      disk: <FontAwesomeIcon icon={faHardDrive} />,
      networkDown: <FontAwesomeIcon icon={faCloudDownloadAlt} />,
      networkUp: <FontAwesomeIcon icon={faCloudUploadAlt} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faServer} />
    },
    colors: {
      cpu: '#e91e63',
      memory: '#9c27b0',
      disk: '#3f51b5',
      networkDown: '#009688',
      networkUp: '#ff9800',
      uptime: '#f44336',
      server: '#607d8b'
    }
  },

  neon: {
    name: 'Neón',
    icons: {
      cpu: <FontAwesomeIcon icon={faBolt} />,
      memory: <FontAwesomeIcon icon={faAtom} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faServer} />
    },
    colors: {
      cpu: '#ff007c',
      memory: '#00d4ff',
      disk: '#ffff00',
      networkDown: '#00ff7c',
      networkUp: '#ff4000',
      uptime: '#7c00ff',
      server: '#ff7c00'
    }
  },

  network: {
    name: 'Red',
    icons: {
      cpu: <FontAwesomeIcon icon={faProjectDiagram} />,
      memory: <FontAwesomeIcon icon={faLayerGroup} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faWifi} />,
      networkUp: <FontAwesomeIcon icon={faRss} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faGlobe} />
    },
    colors: {
      cpu: '#2196f3',
      memory: '#4caf50',
      disk: '#ff9800',
      networkDown: '#00bcd4',
      networkUp: '#e91e63',
      uptime: '#9c27b0',
      server: '#3f51b5'
    }
  },

  cyberpunk: {
    name: 'Cyberpunk',
    icons: {
      cpu: <FontAwesomeIcon icon={faRobot} />,
      memory: <FontAwesomeIcon icon={faBrain} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faTerminal} />
    },
    colors: {
      cpu: '#00ff41',
      memory: '#ff0080',
      disk: '#00d4ff',
      networkDown: '#ffff00',
      networkUp: '#ff4000',
      uptime: '#8000ff',
      server: '#ff8000'
    }
  },

  thermal: {
    name: 'Térmico',
    icons: {
      cpu: <FontAwesomeIcon icon={faThermometerHalf} />,
      memory: <FontAwesomeIcon icon={faThermometerFull} />,
      disk: <FontAwesomeIcon icon={faFan} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faSnowflake} />
    },
    colors: {
      cpu: '#ff5722',
      memory: '#f44336',
      disk: '#2196f3',
      networkDown: '#00bcd4',
      networkUp: '#ff9800',
      uptime: '#4caf50',
      server: '#9c27b0'
    }
  },

  signals: {
    name: 'Señales',
    icons: {
      cpu: <FontAwesomeIcon icon={faSignal} />,
      memory: <FontAwesomeIcon icon={faWaveSquare} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faWifi} />,
      networkUp: <FontAwesomeIcon icon={faBroadcastTower} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faRadio} />
    },
    colors: {
      cpu: '#4b0082',
      memory: '#0000ff',
      disk: '#191970',
      networkDown: '#483d8b',
      networkUp: '#6a5acd',
      uptime: '#9932cc',
      server: '#8b008b'
    }
  },

  energy: {
    name: 'Energía',
    icons: {
      cpu: <FontAwesomeIcon icon={faBolt} />,
      memory: <FontAwesomeIcon icon={faBatteryFull} />,
      disk: <FontAwesomeIcon icon={faPlug} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faPowerOff} />,
      server: <FontAwesomeIcon icon={faLightbulb} />
    },
    colors: {
      cpu: '#ffeb3b',
      memory: '#4caf50',
      disk: '#2196f3',
      networkDown: '#00bcd4',
      networkUp: '#e91e63',
      uptime: '#ff5722',
      server: '#ff9800'
    }
  },

  monitoring: {
    name: 'Monitoreo',
    icons: {
      cpu: <FontAwesomeIcon icon={faEye} />,
      memory: <FontAwesomeIcon icon={faChartArea} />,
      disk: <FontAwesomeIcon icon={faChartPie} />,
      networkDown: <FontAwesomeIcon icon={faSearchMinus} />,
      networkUp: <FontAwesomeIcon icon={faSearchPlus} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faDesktop} />
    },
    colors: {
      cpu: '#4caf50',
      memory: '#2196f3',
      disk: '#ff9800',
      networkDown: '#f44336',
      networkUp: '#9c27b0',
      uptime: '#00bcd4',
      server: '#607d8b'
    }
  },

  scientific: {
    name: 'Científico',
    icons: {
      cpu: <FontAwesomeIcon icon={faAtom} />,
      memory: <FontAwesomeIcon icon={faDna} />,
      disk: <FontAwesomeIcon icon={faFlask} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faMicroscope} />
    },
    colors: {
      cpu: '#4caf50',
      memory: '#e91e63',
      disk: '#2196f3',
      networkDown: '#ff5722',
      networkUp: '#9c27b0',
      uptime: '#00bcd4',
      server: '#ff9800'
    }
  },

  geometric: {
    name: 'Geométrico',
    icons: {
      cpu: <FontAwesomeIcon icon={faCube} />,
      memory: <FontAwesomeIcon icon={faSquare} />,
      disk: <FontAwesomeIcon icon={faCircle} />,
      networkDown: <FontAwesomeIcon icon={faCaretDown} />,
      networkUp: <FontAwesomeIcon icon={faCaretUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faGem} />
    },
    colors: {
      cpu: '#e91e63',
      memory: '#9c27b0',
      disk: '#3f51b5',
      networkDown: '#2196f3',
      networkUp: '#00bcd4',
      uptime: '#4caf50',
      server: '#ff9800'
    }
  },

  security: {
    name: 'Seguridad',
    icons: {
      cpu: <FontAwesomeIcon icon={faShield} />,
      memory: <FontAwesomeIcon icon={faLock} />,
      disk: <FontAwesomeIcon icon={faKey} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faFingerprint} />
    },
    colors: {
      cpu: '#f44336',
      memory: '#e91e63',
      disk: '#9c27b0',
      networkDown: '#673ab7',
      networkUp: '#3f51b5',
      uptime: '#2196f3',
      server: '#607d8b'
    }
  },

  retro: {
    name: 'Retro',
    icons: {
      cpu: <FontAwesomeIcon icon={faCube} />,
      memory: <FontAwesomeIcon icon={faMemory} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faTerminal} />
    },
    colors: {
      cpu: '#ff00ff',
      memory: '#00ffff',
      disk: '#ffff00',
      networkDown: '#ff0080',
      networkUp: '#8000ff',
      uptime: '#00ff80',
      server: '#ff8000'
    }
  },

  industrial: {
    name: 'Industrial',
    icons: {
      cpu: <FontAwesomeIcon icon={faCogs} />,
      memory: <FontAwesomeIcon icon={faIndustry} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faTools} />
    },
    colors: {
      cpu: '#607d8b',
      memory: '#455a64',
      disk: '#546e7a',
      networkDown: '#78909c',
      networkUp: '#90a4ae',
      uptime: '#b0bec5',
      server: '#cfd8dc'
    }
  },

  devices: {
    name: 'Dispositivos',
    icons: {
      cpu: <FontAwesomeIcon icon={faLaptop} />,
      memory: <FontAwesomeIcon icon={faTablet} />,
      disk: <FontAwesomeIcon icon={faHdd} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faDesktop} />
    },
    colors: {
      cpu: '#795548',
      memory: '#ff5722',
      disk: '#ff9800',
      networkDown: '#4caf50',
      networkUp: '#2196f3',
      uptime: '#9c27b0',
      server: '#607d8b'
    }
  },

  medical: {
    name: 'Médico',
    icons: {
      cpu: <FontAwesomeIcon icon={faHeartbeat} />,
      memory: <FontAwesomeIcon icon={faBrain} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faStethoscope} />
    },
    colors: {
      cpu: '#f44336',
      memory: '#e91e63',
      disk: '#2196f3',
      networkDown: '#4caf50',
      networkUp: '#ff9800',
      uptime: '#9c27b0',
      server: '#00bcd4'
    }
  },

  dark: {
    name: 'Oscuro',
    icons: {
      cpu: <FontAwesomeIcon icon={faMicrochip} />,
      memory: <FontAwesomeIcon icon={faMemory} />,
      disk: <FontAwesomeIcon icon={faHdd} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faServer} />
    },
    colors: {
      cpu: '#666',
      memory: '#777',
      disk: '#888',
      networkDown: '#999',
      networkUp: '#aaa',
      uptime: '#bbb',
      server: '#ccc'
    }
  },

  colorful: {
    name: 'Colorido',
    icons: {
      cpu: <FontAwesomeIcon icon={faFire} />,
      memory: <FontAwesomeIcon icon={faGem} />,
      disk: <FontAwesomeIcon icon={faDatabase} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faStar} />
    },
    colors: {
      cpu: '#ff4444',
      memory: '#44ff44',
      disk: '#4444ff',
      networkDown: '#ff44ff',
      networkUp: '#ffff44',
      uptime: '#44ffff',
      server: '#ff8844'
    }
  },

  pastel: {
    name: 'Pastel',
    icons: {
      cpu: <FontAwesomeIcon icon={faMicrochip} />,
      memory: <FontAwesomeIcon icon={faMemory} />,
      disk: <FontAwesomeIcon icon={faHdd} />,
      networkDown: <FontAwesomeIcon icon={faArrowDown} />,
      networkUp: <FontAwesomeIcon icon={faArrowUp} />,
      uptime: <FontAwesomeIcon icon={faClock} />,
      server: <FontAwesomeIcon icon={faServer} />
    },
    colors: {
      cpu: '#ffb3ba',
      memory: '#bae1ff',
      disk: '#ffffba',
      networkDown: '#baffc9',
      networkUp: '#ffdfba',
      uptime: '#e0bbff',
      server: '#c9c9c9'
    }
  }
};
