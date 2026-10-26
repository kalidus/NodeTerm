import React from 'react';
import DnsSuitePanel from './DnsSuitePanel';

export default function MailDnsAlias(props) {
  return <DnsSuitePanel {...props} initialView="mail" />;
}
