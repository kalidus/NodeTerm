import React from 'react';
import WebSecurityScanPanel from './WebSecurityScanPanel';

export default function RedirectChainAlias(props) {
  return <WebSecurityScanPanel {...props} initialView="redirects" />;
}