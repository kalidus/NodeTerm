import React from 'react';
import WebSecurityScanPanel from './WebSecurityScanPanel';

export default function HttpHeadersAlias(props) {
  return <WebSecurityScanPanel {...props} initialView="headers" />;
}
