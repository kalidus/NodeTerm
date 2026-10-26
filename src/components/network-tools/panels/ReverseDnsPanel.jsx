import React from 'react';
import DnsSuitePanel from './DnsSuitePanel';

export default function ReverseDnsPanel(props) {
  return <DnsSuitePanel {...props} initialView="lookup" initialMode="reverse" />;
}
