import React from 'react';
import { FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian } from 'react-icons/si';

export const DistroIcon = ({ distro, size = 14 }) => {
  const iconStyle = { fontSize: `${size}px`, marginRight: '6px' };
  
  switch (distro) {
    case 'ubuntu':
      return <FaUbuntu style={iconStyle} />;
    case 'debian':
      return <SiDebian style={iconStyle} />;
    case 'redhat':
    case 'rhel':
      return <FaRedhat style={iconStyle} />;
    case 'centos':
      return <FaCentos style={iconStyle} />;
    case 'fedora':
      return <FaFedora style={iconStyle} />;

    default:
      return <FaLinux style={iconStyle} />;
  }
};

export default DistroIcon;
